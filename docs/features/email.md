# Email

EuroCRM can send individual emails directly from contact and deal pages, track opens and clicks, and maintain a full email history. Email sending requires configuring SMTP credentials in Settings first.

---

## SMTP Configuration

Before sending email, an organization admin must configure SMTP settings at **Settings → Email**. See [Settings](./settings.md) for the full configuration UI.

The SMTP password is encrypted using AES-256-GCM before being stored in the database. The `ENCRYPTION_KEY` environment variable (exactly 32 characters) must be set for this to work. See [Deployment](../deployment.md).

### EmailConfig fields

| Field | Description |
|---|---|
| `host` | SMTP server hostname (e.g., `smtp.mailgun.org`) |
| `port` | SMTP port (typically 587 for STARTTLS, 465 for SSL) |
| `secure` | `true` for SSL (port 465), `false` for STARTTLS |
| `username` | SMTP authentication username |
| `fromName` | Display name shown in the From field |
| `fromEmail` | From email address |

---

## Sending an Email

Emails are sent via:

```
POST /api/email/send
```

Request body:

| Field | Type | Constraints | Description |
|---|---|---|---|
| `to` | string | Required, valid email | Recipient address |
| `subject` | string | Required, max 500 | Email subject line |
| `htmlBody` | string | Required | HTML email body |
| `textBody` | string | Optional | Plain-text fallback |
| `contactId` | string | Optional | Link email to a contact |
| `dealId` | string | Optional | Link email to a deal |

On send:
1. A `trackingId` (UUID) is generated
2. The HTML body has all `<a href>` links rewritten to pass through the click tracker
3. A 1×1 transparent tracking pixel is appended before `</body>`
4. The email is sent via Nodemailer using the org's SMTP config
5. An `EmailMessage` document is created with `status: 'sent'`

If sending fails, the `EmailMessage` is created with `status: 'failed'` and the error message is stored in `errorMessage`.

---

## Open Tracking

Open tracking works via a 1×1 transparent pixel injected into every email's HTML body:

```
GET /api/email/track/open?tid=<trackingId>
```

When a recipient's email client loads the pixel:
1. A new entry is appended to the `opens` array on the `EmailMessage` document
2. Each open record includes `timestamp`, `ip`, and `userAgent`
3. The endpoint returns a 1×1 transparent GIF with `Cache-Control: no-store`

Note: Open tracking is limited by email clients that block images by default.

---

## Click Tracking

Click tracking rewrites all `<a href>` links before sending:

```
GET /api/email/track/click?tid=<trackingId>&url=<encodedUrl>
```

When a recipient clicks a link:
1. A new entry is appended to the `clicks` array on the `EmailMessage` document
2. Each click record includes `timestamp`, `url`, `ip`, and `userAgent`
3. The recipient is redirected (HTTP 302) to the original URL

Links that start with `mailto:`, `tel:`, or that already point to the tracker endpoint are not rewritten.

---

## Email Message Data Model

| Field | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Owning organization |
| `to` | string | Recipient address (lowercased) |
| `from` | string | Sender address |
| `subject` | string | Subject line |
| `htmlBody` | string | HTML body (with tracking injected) |
| `textBody` | string | Plain text fallback |
| `contactId` | string | Linked contact (optional) |
| `dealId` | string | Linked deal (optional) |
| `trackingId` | string | Unique tracking identifier (UUID) |
| `status` | `queued` \| `sent` \| `failed` | Send status |
| `errorMessage` | string | Error details if status is `failed` |
| `opens` | Open[] | Array of open events |
| `clicks` | Click[] | Array of click events |
| `sentAt` | string (ISO 8601) | When the email was sent |
| `senderId` | string | User who sent the email |

### Open event

| Field | Description |
|---|---|
| `timestamp` | When the open was recorded |
| `ip` | IP address of the opener |
| `userAgent` | Browser/client user-agent string |

### Click event

| Field | Description |
|---|---|
| `timestamp` | When the click was recorded |
| `url` | Original destination URL |
| `ip` | IP address |
| `userAgent` | User-agent string |

---

## Email History

The email list for a contact or deal is retrieved via:

```
GET /api/email/messages?contactId=<id>
GET /api/email/messages?dealId=<id>
```

Individual emails can be retrieved at:

```
GET /api/email/messages/:id
```

---

## Testing SMTP Configuration

```
POST /api/settings/email-config/test
```

This calls Nodemailer's `transporter.verify()` against the stored SMTP configuration and returns `{ success: true }` on success or `{ success: false, error: "..." }` on failure.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| POST | `/api/email/send` | Send an email |
| GET | `/api/email/messages` | List email messages |
| GET | `/api/email/messages/:id` | Get a single email message |
| GET | `/api/email/track/open` | Record an open event (public) |
| GET | `/api/email/track/click` | Record a click and redirect (public) |
| GET | `/api/settings/email-config` | Get SMTP configuration |
| POST | `/api/settings/email-config` | Create/update SMTP configuration |
| POST | `/api/settings/email-config/test` | Test SMTP connection |

---

## Related

- [Campaigns](./campaigns.md) — bulk email to filtered contact lists
- [Settings](./settings.md) — SMTP configuration UI
- [Deployment](../deployment.md) — `ENCRYPTION_KEY` for password storage
