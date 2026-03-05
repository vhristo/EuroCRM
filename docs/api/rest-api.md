# REST API v1 Reference

The EuroCRM REST API v1 allows external applications and integrations to read and write CRM data programmatically. All v1 endpoints are authenticated via API keys.

---

## Base URL

```
https://your-eurocrm.com/api/v1
```

---

## Authentication

All v1 API requests must include an `X-API-Key` header with a valid API key.

```bash
curl https://your-eurocrm.com/api/v1/contacts \
  -H "X-API-Key: eurocrm_your_api_key_here"
```

API keys are created in Settings → API Keys by an admin. Each key has a set of explicit permissions. If a key lacks the required permission for an endpoint, the server returns HTTP 403.

See [Settings](../features/settings.md#api-keys) for how to create and manage API keys.

---

## Request Format

- All request bodies must be JSON (`Content-Type: application/json`)
- All responses are JSON
- Dates are ISO 8601 strings (e.g., `"2026-03-05T10:00:00.000Z"`)

---

## Response Format

### List endpoints

```json
{
  "items": [...],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

### Single item

The item object directly.

### Success (no body)

```json
{ "success": true }
```

### Error

```json
{
  "error": "Contact not found"
}
```

Or for validation errors:

```json
{
  "error": {
    "fieldErrors": {
      "email": ["Invalid email address"],
      "value": ["Value must be an integer (cents)"]
    },
    "formErrors": []
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Successful GET or PUT |
| 201 | Successful POST (resource created) |
| 400 | Validation error |
| 401 | Missing or invalid API key |
| 403 | Valid API key but insufficient permissions |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Pagination

All list endpoints support:

| Parameter | Type | Default | Maximum | Description |
|---|---|---|---|---|
| `page` | integer | 1 | — | Page number |
| `limit` | integer | 20 | 100 | Items per page |

Example: `GET /api/v1/contacts?page=2&limit=50`

---

## Contacts

### List contacts

**Permission required:** `contacts:read`

```
GET /api/v1/contacts
```

**Query parameters:**

| Parameter | Description |
|---|---|
| `search` | Search across firstName, lastName, email, company (case-insensitive) |
| `ownerId` | Filter by owner user ID |
| `page` | Page number (default 1) |
| `limit` | Items per page (default 20, max 100) |

**Example:**

```bash
curl "https://your-eurocrm.com/api/v1/contacts?search=mueller&limit=10" \
  -H "X-API-Key: eurocrm_your_key"
```

**Response:**

```json
{
  "items": [
    {
      "id": "65f3a1b2c3d4e5f6a7b8c9d0",
      "organizationId": "65f3a1b2c3d4e5f6a7b8c9d1",
      "firstName": "Anna",
      "lastName": "Müller",
      "email": "anna.mueller@example.com",
      "phone": "+49 30 12345678",
      "company": "ACME GmbH",
      "jobTitle": "Head of Procurement",
      "country": "Germany",
      "city": "Berlin",
      "currency": "EUR",
      "tags": ["enterprise", "dach"],
      "ownerId": "65f3a1b2c3d4e5f6a7b8c9d2",
      "createdAt": "2026-01-15T09:30:00.000Z",
      "updatedAt": "2026-03-01T14:20:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### Get a contact

**Permission required:** `contacts:read`

```
GET /api/v1/contacts/:id
```

**Example:**

```bash
curl "https://your-eurocrm.com/api/v1/contacts/65f3a1b2c3d4e5f6a7b8c9d0" \
  -H "X-API-Key: eurocrm_your_key"
```

Returns the contact object (same shape as list item).

---

### Create a contact

**Permission required:** `contacts:write`

```
POST /api/v1/contacts
Content-Type: application/json
```

**Request body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `firstName` | string | Yes | Max 100, trimmed |
| `lastName` | string | Yes | Max 100, trimmed |
| `email` | string | No | Valid email, lowercased |
| `phone` | string | No | Max 50 |
| `company` | string | No | Max 200 |
| `jobTitle` | string | No | Max 200 |
| `country` | string | No | Max 100 |
| `city` | string | No | Max 100 |
| `address` | string | No | Max 500 |
| `currency` | string | No | 3-char ISO code, default `EUR` |
| `tags` | string[] | No | Max 20 tags, each max 50 chars |
| `notes` | string | No | Max 5000 |
| `ownerId` | string | No | User ID; defaults to organization ID if omitted |

**Example:**

```bash
curl -X POST "https://your-eurocrm.com/api/v1/contacts" \
  -H "X-API-Key: eurocrm_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anna",
    "lastName": "Müller",
    "email": "anna.mueller@example.com",
    "company": "ACME GmbH",
    "country": "Germany",
    "tags": ["enterprise"]
  }'
```

**Response:** HTTP 201, the created contact object.

---

### Update a contact

**Permission required:** `contacts:write`

```
PUT /api/v1/contacts/:id
Content-Type: application/json
```

All fields are optional (partial update). Only provided fields are changed.

**Example:**

```bash
curl -X PUT "https://your-eurocrm.com/api/v1/contacts/65f3a1b2c3d4e5f6a7b8c9d0" \
  -H "X-API-Key: eurocrm_your_key" \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+49 30 99887766", "tags": ["enterprise", "vip"] }'
```

**Response:** HTTP 200, the updated contact object.

---

### Delete a contact

**Permission required:** `contacts:delete`

```
DELETE /api/v1/contacts/:id
```

**Response:** HTTP 200, `{ "success": true }`

---

## Deals

### List deals

**Permission required:** `deals:read`

```
GET /api/v1/deals
```

**Query parameters:**

| Parameter | Description |
|---|---|
| `search` | Search by deal title |
| `ownerId` | Filter by owner |
| `status` | Filter by status: `open`, `won`, `lost` |
| `pipelineId` | Filter by pipeline |
| `page` | Page number |
| `limit` | Items per page |

**Example:**

```bash
curl "https://your-eurocrm.com/api/v1/deals?status=open&limit=50" \
  -H "X-API-Key: eurocrm_your_key"
```

---

### Get a deal

**Permission required:** `deals:read`

```
GET /api/v1/deals/:id
```

---

### Create a deal

**Permission required:** `deals:write`

```
POST /api/v1/deals
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | Trimmed |
| `value` | number | Yes | Integer ≥ 0, in cents |
| `currency` | string | No | 3-char ISO code, default `EUR` |
| `stage` | string | Yes | Stage ID from the pipeline |
| `pipelineId` | string | Yes | Pipeline ID |
| `contactId` | string | No | Contact to link |
| `probability` | number | No | Integer 0–100 |
| `expectedCloseDate` | string | No | ISO 8601 date string |
| `notes` | string | No | Free text |
| `ownerId` | string | No | User ID; defaults to organization ID |

**Important:** `value` is in cents. To create a deal worth €1,500.00, send `"value": 150000`.

**Example:**

```bash
curl -X POST "https://your-eurocrm.com/api/v1/deals" \
  -H "X-API-Key: eurocrm_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Enterprise License - ACME GmbH",
    "value": 1500000,
    "currency": "EUR",
    "stage": "proposal",
    "pipelineId": "65f3a1b2c3d4e5f6a7b8c9d3"
  }'
```

**Response:** HTTP 201, the created deal object.

---

### Update a deal

**Permission required:** `deals:write`

```
PUT /api/v1/deals/:id
```

Supports all create fields as optional updates, plus:

| Field | Description |
|---|---|
| `status` | `open`, `won`, or `lost` |
| `lostReason` | Reason for losing (max 1000 chars) |

---

### Delete a deal

**Permission required:** `deals:delete`

```
DELETE /api/v1/deals/:id
```

---

## Leads

### List leads

**Permission required:** `leads:read`

```
GET /api/v1/leads
```

**Query parameters:** `search`, `ownerId`, `status`, `page`, `limit`

---

### Get a lead

**Permission required:** `leads:read`

```
GET /api/v1/leads/:id
```

---

### Create a lead

**Permission required:** `leads:write`

```
POST /api/v1/leads
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | Max 200, trimmed |
| `email` | string | No | Valid email |
| `phone` | string | No | Max 50 |
| `company` | string | No | Max 200 |
| `source` | string | No | One of: `website`, `referral`, `cold_call`, `email_campaign`, `social_media`, `trade_show`, `other` |
| `status` | string | No | One of: `new`, `contacted`, `qualified`, `unqualified`, `converted` |
| `notes` | string | No | Max 5000 |

---

### Update a lead

**Permission required:** `leads:write`

```
PUT /api/v1/leads/:id
```

---

### Delete a lead

**Permission required:** `leads:delete`

```
DELETE /api/v1/leads/:id
```

---

## Activities

### List activities

**Permission required:** `activities:read`

```
GET /api/v1/activities
```

**Query parameters:** `contactId`, `dealId`, `done` (true/false), `ownerId`, `page`, `limit`

---

### Get an activity

**Permission required:** `activities:read`

```
GET /api/v1/activities/:id
```

---

### Create an activity

**Permission required:** `activities:write`

```
POST /api/v1/activities
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `type` | string | Yes | `call`, `email`, `meeting`, `task`, `note` |
| `subject` | string | Yes | Max 300, trimmed |
| `description` | string | No | Max 5000 |
| `dueDate` | string | No | ISO 8601 date-time |
| `contactId` | string | No | Contact ID |
| `dealId` | string | No | Deal ID |

---

### Update an activity

**Permission required:** `activities:write`

```
PUT /api/v1/activities/:id
```

---

### Delete an activity

**Permission required:** `activities:delete`

```
DELETE /api/v1/activities/:id
```

---

## Pipelines

### List pipelines

**Permission required:** `pipelines:read`

```
GET /api/v1/pipelines
```

Returns all pipelines for the organization. The default pipeline appears first.

**Example:**

```bash
curl "https://your-eurocrm.com/api/v1/pipelines" \
  -H "X-API-Key: eurocrm_your_key"
```

**Response:**

```json
{
  "items": [
    {
      "id": "65f3a1b2c3d4e5f6a7b8c9d3",
      "organizationId": "65f3a1b2c3d4e5f6a7b8c9d1",
      "name": "Sales Pipeline",
      "isDefault": true,
      "stages": [
        { "id": "lead", "name": "Lead", "order": 0, "probability": 10, "rotDays": 14 },
        { "id": "proposal", "name": "Proposal", "order": 1, "probability": 40, "rotDays": 21 },
        { "id": "negotiation", "name": "Negotiation", "order": 2, "probability": 70, "rotDays": 14 },
        { "id": "closed_won", "name": "Closed Won", "order": 3, "probability": 100, "rotDays": 0 }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-02-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 1
}
```

---

## Webhook Events Fired by v1 API

Creating, updating, and deleting resources via the v1 API fires the same webhook events as the internal API:

| Operation | Webhook event |
|---|---|
| `POST /api/v1/contacts` | `contact.created` |
| `PUT /api/v1/contacts/:id` | `contact.updated` |
| `DELETE /api/v1/contacts/:id` | `contact.deleted` |
| `POST /api/v1/deals` | `deal.created` |

See [Webhooks](./webhooks.md) for setup and payload format.

---

## Related

- [Settings — API Keys](../features/settings.md#api-keys) — creating and managing API keys
- [Webhooks](./webhooks.md) — real-time event notifications
- [Authentication](../auth.md) — JWT vs API key authentication
