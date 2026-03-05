# Contacts

Contacts represent individual people in your CRM — customers, prospects, and business partners.

---

## Contact Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization (always set automatically) |
| `firstName` | string | Required, max 100 | First name |
| `lastName` | string | Required, max 100 | Last name |
| `email` | string | Optional, valid email, lowercased | Email address |
| `phone` | string | Optional, max 50 | Phone number |
| `company` | string | Optional, max 200 | Company name |
| `jobTitle` | string | Optional, max 200 | Job title |
| `country` | string | Optional, max 100 | Country |
| `city` | string | Optional, max 100 | City |
| `address` | string | Optional, max 500 | Street address |
| `currency` | string | 3-character ISO code, default `EUR` | Preferred currency for deals |
| `tags` | string[] | Max 20 tags, each max 50 chars | Free-form labels |
| `notes` | string | Optional, max 5000 | Free-text notes |
| `ownerId` | string | Required | ID of the user who owns this contact |
| `customFields` | Record<string, unknown> | — | Values for organization-defined custom fields |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

---

## Creating a Contact

**Required fields:** `firstName`, `lastName`

**Optional fields:** `email`, `phone`, `company`, `jobTitle`, `country`, `city`, `address`, `currency`, `tags`, `notes`

The `ownerId` is automatically set to the authenticated user's ID when creating a contact through the UI. When using the REST API v1, `ownerId` can be passed in the request body; if omitted, it defaults to the organization ID.

---

## Search and Pagination

The contacts list supports:

- **Full-text search** (`?search=...`) — matches against `firstName`, `lastName`, `email`, and `company` (case-insensitive regex)
- **Owner filter** (`?ownerId=...`) — filter by assigned owner
- **Pagination** — `?page=1&limit=20` (default page size 20, maximum 100)

Sales reps automatically see only their own contacts (`ownerId` filter is enforced by RBAC). Managers and admins see all contacts in the organization.

Response shape:

```json
{
  "items": [...],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

---

## Tags

Tags are free-form string labels attached to a contact. They are used for:

- Segmenting recipients in [email campaigns](./campaigns.md) (`recipientFilter.tags`)
- Filtering contacts in the UI
- Automated tagging via [workflow actions](./automations.md) (`add_tag`)

A contact can have up to 20 tags, each up to 50 characters.

---

## Owner Assignment

Every contact must have an `ownerId` pointing to a user in the same organization. The owner is the sales rep responsible for the contact.

- Sales reps can only view and edit their own contacts.
- Managers and admins can view, edit, and reassign contacts belonging to any user in the organization.
- The `assign_owner` workflow action can automatically reassign contacts.

---

## Custom Fields

Organizations can define custom fields for contacts (see [Custom Fields](./custom-fields.md)). Custom field values are stored in the `customFields` map on each contact document.

Custom field values are rendered by the `CustomFieldRenderer` component in contact forms and detail views.

---

## Contact Detail View

The contact detail page (`/contacts/:id`) shows:

- All core fields
- Custom field values
- Linked deals
- Activity timeline (all activities linked to this contact)
- Email history (all emails sent to this contact)

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/contacts` | List contacts (paginated, searchable) |
| POST | `/api/contacts` | Create a new contact |
| GET | `/api/contacts/:id` | Get a single contact |
| PUT | `/api/contacts/:id` | Update a contact |
| DELETE | `/api/contacts/:id` | Delete a contact |

For external integrations, see the [REST API v1 reference](../api/rest-api.md).

---

## Related

- [Deals](./deals.md) — deals can be linked to a contact via `contactId`
- [Activities](./activities.md) — activities can be linked to a contact via `contactId`
- [Campaigns](./campaigns.md) — campaigns send to contacts matching recipient filters
- [Custom Fields](./custom-fields.md) — adding custom data fields to contacts
- [GDPR](../gdpr.md) — data export and right-to-erasure for contacts
