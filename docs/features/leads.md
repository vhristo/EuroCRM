# Leads

The lead inbox captures incoming sales prospects before they are qualified as deals. Leads can be created manually, imported via the REST API, or submitted through a [web form](./web-forms.md).

---

## Lead Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization |
| `name` | string | Required, max 200, trimmed | Lead's full name |
| `email` | string | Optional, valid email, lowercased | Email address |
| `phone` | string | Optional, max 50 | Phone number |
| `company` | string | Optional, max 200 | Company name |
| `source` | string (enum) | Default `other` | Where the lead came from |
| `status` | string (enum) | Default `new` | Current status in the lead workflow |
| `notes` | string | Optional, max 5000 | Free-text notes |
| `ownerId` | string | Required | Assigned user |
| `customFields` | Record<string, unknown> | — | Organization-defined custom field values |
| `convertedToDealId` | string \| null | — | ID of the deal created on conversion |
| `convertedToContactId` | string \| null | — | ID of the contact created on conversion |
| `convertedAt` | string (ISO 8601) | — | When conversion occurred |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

---

## Lead Sources

| Value | Label |
|---|---|
| `website` | Website |
| `referral` | Referral |
| `cold_call` | Cold Call |
| `email_campaign` | Email Campaign |
| `social_media` | Social Media |
| `trade_show` | Trade Show |
| `other` | Other |

Web form submissions automatically set `source` to `website`.

---

## Lead Statuses

| Value | Meaning |
|---|---|
| `new` | Just arrived, not yet reviewed |
| `contacted` | Outreach has been made |
| `qualified` | Confirmed as a real opportunity |
| `unqualified` | Ruled out — not worth pursuing |
| `converted` | Converted to a contact and deal |

The status can be updated manually from the lead detail view. Setting `status: 'converted'` programmatically is possible but the conversion endpoint is the recommended path.

---

## Lead Conversion

Converting a lead creates a new **Contact** and a new **Deal** simultaneously, then links them to the original lead.

### Conversion Endpoint

```
POST /api/leads/:id/convert
```

Request body:

| Field | Type | Constraints | Description |
|---|---|---|---|
| `dealTitle` | string | Required, max 300, trimmed | Title for the new deal |
| `dealValue` | number | Required, integer ≥ 0 | Deal value in cents |
| `currency` | string | 3-char ISO code, default `EUR` | Currency |
| `pipelineId` | string | Required | Pipeline for the new deal |
| `stage` | string | Required | Initial stage for the new deal |

On success:
1. A new `Contact` is created from the lead's `name`, `email`, `phone`, `company`
2. A new `Deal` is created with the provided deal fields and `contactId` set to the new contact
3. The lead's `status` is set to `converted`
4. `convertedToDealId` and `convertedToContactId` are set on the lead
5. `convertedAt` is set to the current time
6. The `lead_converted` workflow trigger fires

The API returns `{ contactId, dealId }`.

---

## Web Form Submissions

When a web form is submitted, EuroCRM automatically creates a lead with:
- `source: 'website'`
- `status: 'new'`
- Fields mapped according to the form's `mapTo` configuration
- `ownerId` set to the first admin user of the organization

See [Web Forms](./web-forms.md) for form setup details.

---

## Validation Rules

### Create lead

| Field | Rule |
|---|---|
| `name` | Required, max 200, trimmed |
| `email` | Optional, valid email format |
| `phone` | Optional, max 50 |
| `company` | Optional, max 200 |
| `source` | One of the source enum values, default `other` |
| `status` | One of the status enum values, default `new` |
| `notes` | Optional, max 5000 |

### Update lead

All fields are optional (partial update).

---

## RBAC Notes

- Sales reps see only their own leads.
- Managers and admins see all leads in the organization.
- Converting a lead requires `leads:write` permission.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/leads` | List leads (paginated) |
| POST | `/api/leads` | Create a new lead |
| GET | `/api/leads/:id` | Get a single lead |
| PUT | `/api/leads/:id` | Update a lead |
| DELETE | `/api/leads/:id` | Delete a lead |
| POST | `/api/leads/:id/convert` | Convert lead to contact + deal |

For external integrations, see the [REST API v1 reference](../api/rest-api.md).

---

## Related

- [Web Forms](./web-forms.md) — automatic lead creation from public form submissions
- [Contacts](./contacts.md) — conversion target
- [Deals](./deals.md) — conversion target
- [Automations](./automations.md) — `lead_created`, `lead_converted` triggers
