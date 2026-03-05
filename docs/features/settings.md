# Settings

The Settings page is accessible to all authenticated users. Certain sections are restricted to admins or managers.

---

## Organization Settings

**Route:** `GET/PUT /api/settings/organization`

**Required role:** admin

Organization-level configuration:

| Field | Description |
|---|---|
| `name` | Organization display name |
| `plan` | Subscription plan: `free`, `starter`, `professional`, `enterprise` |
| `settings.defaultCurrency` | Default 3-character ISO currency code (e.g., `EUR`) |
| `settings.timezone` | IANA timezone string (e.g., `Europe/Berlin`) |

---

## Profile Management

**Route:** `GET/PUT /api/settings/profile`

All authenticated users can view and update their own profile:

| Field | Description |
|---|---|
| `firstName` | First name (max 100) |
| `lastName` | Last name (max 100) |
| `email` | Email address (must be unique) |

---

## Password Change

Included in the profile update endpoint. Send the current password and a new password in the request body. Passwords must be 8–128 characters.

---

## Pipeline Management

**Routes:** `GET/POST /api/pipeline`, `GET/PUT/DELETE /api/pipeline/:id`, `POST /api/pipeline/:id/default`

**Required role:** admin or manager

Create, rename, and configure pipelines and their stages. See [Pipeline Management](./pipeline-management.md).

Accessible in the Settings UI under the **Pipelines** tab.

---

## Custom Fields

**Routes:** `GET/POST /api/settings/custom-fields`, `GET/PUT/DELETE /api/settings/custom-fields/:id`, `POST /api/settings/custom-fields/reorder`

**Required role:** admin

Create, edit, delete, and reorder custom fields for contacts, deals, and leads. See [Custom Fields](./custom-fields.md).

---

## Email Configuration

**Routes:** `GET/POST /api/settings/email-config`, `POST /api/settings/email-config/test`

**Required role:** admin

Configure the organization's SMTP settings for email sending. The SMTP password is encrypted with AES-256-GCM before storage.

| Field | Description |
|---|---|
| `host` | SMTP hostname |
| `port` | SMTP port (default 587) |
| `secure` | Boolean — `true` for SSL (port 465) |
| `username` | SMTP username |
| `password` | SMTP password (stored encrypted, never returned in GET responses) |
| `fromName` | Sender display name |
| `fromEmail` | Sender email address |

Use "Test Connection" to verify credentials before saving. See [Email](./email.md) for more.

---

## API Keys

**Routes:** `GET/POST /api/settings/api-keys`, `DELETE /api/settings/api-keys/:id`

**Required role:** admin (create/delete), admin/manager (read)

API keys authorize external integrations to access the v1 REST API.

### Key format

Generated keys follow the format `eurocrm_<random>`. The full key is shown **only once** at creation and is never retrievable afterwards. Only the SHA-256 hash is stored.

### Permissions

Each API key has a set of explicit permissions from the following list:

| Permission | Description |
|---|---|
| `contacts:read` | Read contacts |
| `contacts:write` | Create/update contacts |
| `contacts:delete` | Delete contacts |
| `deals:read` | Read deals |
| `deals:write` | Create/update deals |
| `deals:delete` | Delete deals |
| `leads:read` | Read leads |
| `leads:write` | Create/update leads |
| `leads:delete` | Delete leads |
| `activities:read` | Read activities |
| `activities:write` | Create/update activities |
| `activities:delete` | Delete activities |
| `pipelines:read` | Read pipelines |

### Expiry

API keys can optionally have an `expiresAt` date. Expired keys return HTTP 401.

### Creating a key

```json
POST /api/settings/api-keys
{
  "name": "My Integration",
  "permissions": ["contacts:read", "contacts:write"],
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

Response includes `key` (the full raw key — save it now, it cannot be retrieved again).

See the [REST API reference](../api/rest-api.md) for usage.

---

## Webhooks

**Routes:** `GET/POST /api/settings/webhooks`, `GET/PUT/DELETE /api/settings/webhooks/:id`, `POST /api/settings/webhooks/:id/test`, `GET /api/settings/webhooks/:id/deliveries`

**Required role:** admin (write), admin/manager (read)

Register webhook endpoints to receive real-time event notifications from EuroCRM. See [Webhooks](../api/webhooks.md) for the full reference.

### Available events

`contact.created`, `contact.updated`, `contact.deleted`, `deal.created`, `deal.updated`, `deal.won`, `deal.lost`, `deal.deleted`, `lead.created`, `lead.updated`, `lead.converted`, `lead.deleted`, `activity.created`, `activity.completed`, `activity.deleted`

### Auto-disable on failure

Webhooks that fail 10 or more times consecutively are automatically disabled (`active: false`). Re-enable by setting `active: true` via `PUT /api/settings/webhooks/:id` — this also resets the failure counter.

---

## GDPR / Privacy

**Routes:** `GET/POST /api/gdpr/requests`, `GET /api/gdpr/requests/:id`, `POST /api/gdpr/requests/:id/confirm`, `GET /api/gdpr/requests/:id/download`

**Required role:** admin (erasure), admin/manager (export)

Manage GDPR data requests for contacts. See [GDPR](../gdpr.md) for the full reference.

Two request types are supported:
- **Export** — generate a JSON package of all data held about a contact
- **Erasure** — anonymize all PII fields for a contact (irreversible; requires typing `DELETE` to confirm)
