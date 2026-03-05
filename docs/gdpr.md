# GDPR Compliance

EuroCRM provides tools to help organizations meet their obligations under the EU General Data Protection Regulation (GDPR), specifically:

- **Article 15 / Right of Access** — export all data held about a contact
- **Article 17 / Right to Erasure** — anonymize all PII for a contact

---

## Overview

GDPR data requests are managed through the Settings → Privacy section of the UI, or via the `/api/gdpr/` endpoints. Requests are tracked as `DataRequest` documents so there is an audit trail for every action.

---

## Data Request Model

| Field | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Owning organization |
| `type` | `export` \| `erasure` | Type of request |
| `contactId` | string | The contact this request is for |
| `contactEmail` | string | Email of the contact at time of request (for audit purposes) |
| `status` | `pending` \| `processing` \| `completed` \| `failed` | Processing status |
| `result.downloadUrl` | string | URL to download export data (export only) |
| `result.exportData` | object | Raw export data (export only) |
| `result.anonymizedFields` | string[] | List of fields that were anonymized (erasure only) |
| `requestedBy` | string | User who created the request |
| `completedAt` | string (ISO 8601) | When the request was processed |
| `createdAt` | string (ISO 8601) | When the request was created |

---

## Data Export (Right of Access)

Generates a JSON package of all data held about a specific contact.

### What is exported

The export includes:

| Section | Contents |
|---|---|
| `contact` | Complete contact record (all fields including custom fields) |
| `deals` | All deals linked to the contact via `contactId` |
| `activities` | All activities linked to the contact via `contactId` |
| `leads` | All leads that were converted into this contact (`convertedToContactId`) |

The export is scoped to the requesting organization — cross-organization data is never included.

Internal MongoDB fields (`__v`) are stripped from the export.

### Export format

```json
{
  "exportedAt": "2026-03-05T10:00:00.000Z",
  "contact": {
    "_id": "...",
    "firstName": "Anna",
    "lastName": "Müller",
    "email": "anna@acme.de",
    ...
  },
  "deals": [...],
  "activities": [...],
  "leads": [...]
}
```

### Creating an export request

```
POST /api/gdpr/request
{
  "type": "export",
  "contactId": "<contactId>"
}
```

**Required role:** admin or manager

### Downloading export data

```
GET /api/gdpr/requests/:id/download
```

Returns the export JSON. The `Content-Type` is `application/json` and `Content-Disposition` triggers a download.

---

## Right to Erasure (Anonymization)

Anonymizes all personally identifiable information (PII) for a contact. This operation is **irreversible**.

### What is anonymized

#### On the Contact record

| Field | After erasure |
|---|---|
| `firstName` | `"REDACTED"` |
| `lastName` | `"REDACTED"` |
| `email` | `"redacted-<contactId>@deleted.invalid"` |
| `phone` | `null` |
| `address` | `null` |
| `notes` | `null` |
| `tags` | `[]` (empty array) |
| `company` | `null` (if was set) |
| `jobTitle` | `null` (if was set) |
| `city` | `null` (if was set) |
| `country` | `null` (if was set) |
| `customFields` | `{}` (cleared, if was set) |

#### Fields preserved

Business-relevant non-PII fields are preserved to maintain audit integrity:

| Field | Reason |
|---|---|
| `_id` | Record identity |
| `organizationId` | Org scoping |
| `ownerId` | Assignment record |
| `currency` | Business configuration |

#### On linked Deals

The `contactId` reference is removed from all deals linked to this contact (`$unset`). Deal business data (title, value, stage, etc.) is preserved.

#### On linked Activities

- The `contactId` reference is removed from all activities linked to this contact
- The `description` field is replaced with `"[Redacted - contact data erased per GDPR request]"`
- Activity business records are preserved

### Two-step confirmation

Erasure requires explicit confirmation to prevent accidental execution.

**Step 1 — Create the request:**

```
POST /api/gdpr/request
{
  "type": "erasure",
  "contactId": "<contactId>"
}
```

**Required role:** admin only

**Step 2 — Confirm the erasure:**

```
POST /api/gdpr/requests/:id/confirm
{
  "confirmation": "DELETE"
}
```

The `confirmation` field must be the literal string `"DELETE"` (uppercase). Any other value returns HTTP 400.

Only after confirmation is the anonymization actually executed.

---

## Role Requirements

| Operation | Required role |
|---|---|
| Create export request | admin or manager |
| Download export data | admin or manager |
| Create erasure request | admin only |
| Confirm erasure | admin only |
| View request history | admin or manager |

---

## Audit Trail

Every data request (export or erasure) is stored permanently as a `DataRequest` document. This provides a complete audit record of:

- Who requested the action (`requestedBy`)
- Which contact was affected (`contactId`, `contactEmail`)
- When the request was created and completed
- The outcome (`status`, `result.anonymizedFields`)

---

## Data Retention

Execution logs for [workflows](./features/automations.md) are automatically deleted after 90 days via a MongoDB TTL index. All other records (contacts, deals, activities, data requests) have no automatic deletion.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| POST | `/api/gdpr/request` | Create a data request (export or erasure) |
| GET | `/api/gdpr/requests` | List data requests |
| GET | `/api/gdpr/requests/:id` | Get a data request |
| POST | `/api/gdpr/requests/:id/confirm` | Confirm and execute an erasure request |
| GET | `/api/gdpr/requests/:id/download` | Download export data |

---

## Related

- [Contacts](./features/contacts.md) — GDPR applies to contact personal data
- [Auth](./auth.md) — role-based access controls for GDPR operations
- [Settings](./features/settings.md#gdpr--privacy) — GDPR UI in settings
