# Campaigns

Campaigns send bulk emails to a filtered list of contacts. Each campaign has a subject, an HTML body with optional merge tags, and a recipient filter that selects contacts by tag, owner, or country.

---

## Campaign Lifecycle

```
draft  →  sending  →  sent
               ↓
            paused  →  sending (resume)
```

| Status | Meaning |
|---|---|
| `draft` | Being composed; not yet sent |
| `scheduled` | Scheduled for future sending (field stored but scheduling is manual) |
| `sending` | Active batch processing in progress |
| `sent` | All recipients have been processed |
| `paused` | Sending paused; can be resumed |

---

## Campaign Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization |
| `name` | string | Required, max 200, trimmed | Internal campaign name |
| `subject` | string | Required, max 500, trimmed | Email subject line (supports merge tags) |
| `htmlBody` | string | Required | HTML email body (supports merge tags) |
| `textBody` | string | Optional | Plain-text fallback (supports merge tags) |
| `recipientFilter` | object | — | Filter defining which contacts receive this campaign |
| `status` | string (enum) | Default `draft` | Campaign status |
| `scheduledAt` | string (ISO 8601) | Optional | Scheduled send time |
| `stats` | Stats object | — | Delivery statistics |
| `createdBy` | string | — | User who created the campaign |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

### Recipient Filter

| Field | Type | Description |
|---|---|---|
| `tags` | string[] (max 20) | Include contacts with any of these tags |
| `ownerId` | string | Include only contacts owned by this user |
| `country` | string | Include only contacts from this country |

All filter fields are optional. An empty filter `{}` targets all contacts in the organization that have an email address.

Filters are ANDed together: a contact must match all specified criteria to be included.

### Stats Object

| Field | Description |
|---|---|
| `totalRecipients` | Number of contacts in the recipient list |
| `sent` | Emails successfully sent |
| `opened` | Emails opened (tracking pixel fired) |
| `clicked` | Emails with at least one link clicked |
| `failed` | Emails that failed to send |

---

## Merge Tags

Merge tags personalize campaign emails with contact-specific data. Supported tags:

| Tag | Resolves to |
|---|---|
| `{{firstName}}` | Contact's first name |
| `{{lastName}}` | Contact's last name |
| `{{email}}` | Contact's email address |
| `{{company}}` | Contact's company name |

Tags that don't match a contact value are replaced with an empty string.

### Example

```html
<p>Hi {{firstName}},</p>
<p>We wanted to follow up with you at {{company}} about our latest offer.</p>
```

Merge tags work in `htmlBody`, `textBody`, and `subject`.

---

## Recipient List Building

When a campaign is sent (`POST /api/campaigns/:id/send`):

1. The recipient filter is evaluated against all contacts in the organization that have a non-empty `email` field
2. A `CampaignRecipient` document is created for each matching contact
3. `stats.totalRecipients` is updated
4. The campaign status is set to `sending`
5. Batch processing begins immediately

---

## Batch Processing

The campaign processor runs in batches of 50 recipients at a time. For each recipient:

1. Load the contact document for merge tag values
2. Apply merge tag replacements to `htmlBody`, `textBody`, and `subject`
3. Inject open tracking pixel and rewrite links (same as individual email sending)
4. Send via the organization's configured SMTP
5. Update the recipient status to `sent` (or `failed`) and record the timestamp
6. Atomically increment `stats.sent` / `stats.failed`

When all recipients have been processed, the campaign status automatically changes to `sent`.

---

## Pausing and Resuming

```
POST /api/campaigns/:id/pause
```

Sets `status` to `paused`. No further batches are processed.

To resume, trigger another send:

```
POST /api/campaigns/:id/send
```

This sets `status` back to `sending` and resumes processing from the remaining `pending` recipients.

---

## Test Emails

Send a test email to a specified address without creating recipient documents:

```
POST /api/campaigns/:id/test
{ "email": "you@example.com" }
```

The test email uses the campaign's body and subject with merge tags applied using empty fallback values. It does not affect `stats` or recipient records.

---

## Campaign Preview

Preview the campaign HTML with merge tags rendered using example values:

```
GET /api/campaigns/:id/preview
```

Returns `{ html: "..." }` with merge tags replaced by placeholder values (e.g., `{{firstName}}` → `"John"`).

---

## Recipient List Preview

Before sending, check which contacts would receive the campaign:

```
GET /api/campaigns/:id/recipients
```

Returns a paginated list of matching contacts based on the current `recipientFilter`.

---

## Validation Rules

### Create campaign

| Field | Rule |
|---|---|
| `name` | Required, max 200, trimmed |
| `subject` | Required, max 500, trimmed |
| `htmlBody` | Required, non-empty |
| `textBody` | Optional |
| `recipientFilter.tags` | Array of strings, max 20 items, each max 50 chars |
| `recipientFilter.ownerId` | Optional string |
| `recipientFilter.country` | Optional string, max 100 |
| `scheduledAt` | Optional ISO 8601 datetime string |

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/campaigns/:id` | Get a campaign |
| PUT | `/api/campaigns/:id` | Update a campaign |
| DELETE | `/api/campaigns/:id` | Delete a campaign |
| POST | `/api/campaigns/:id/send` | Start or resume sending |
| POST | `/api/campaigns/:id/pause` | Pause sending |
| POST | `/api/campaigns/:id/test` | Send a test email |
| GET | `/api/campaigns/:id/preview` | Preview with merge tags |
| GET | `/api/campaigns/:id/recipients` | Preview recipient list |

---

## Related

- [Email](./email.md) — SMTP configuration and individual email sending
- [Contacts](./contacts.md) — tags and owner used in recipient filters
- [Settings](./settings.md) — SMTP configuration required for sending
