# Activities

Activities are the logged interactions and tasks associated with contacts and deals. They cover scheduled outreach, completed meetings, recorded calls, and internal notes.

---

## Activity Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization |
| `type` | string (enum) | Required | Activity type |
| `subject` | string | Required, max 300, trimmed | Short summary |
| `description` | string | Optional, max 5000 | Longer notes or body |
| `dueDate` | string (ISO 8601) | Optional | When the activity is due or scheduled |
| `done` | boolean | Default `false` | Whether the activity has been completed |
| `doneAt` | string (ISO 8601) | — | Timestamp when marked done |
| `contactId` | string | Optional | Linked contact |
| `dealId` | string | Optional | Linked deal |
| `ownerId` | string | Required | Assigned user |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

---

## Activity Types

| Value | Icon | Use Case |
|---|---|---|
| `call` | Phone | Scheduled or logged phone calls |
| `email` | Envelope | Email follow-ups to schedule or track |
| `meeting` | Calendar | In-person or video meetings |
| `task` | Checkbox | Generic to-do items |
| `note` | Document | Freeform notes about a contact or deal |

---

## Linking Activities

An activity can be linked to a contact, a deal, or both simultaneously:

- **`contactId`** — links to a specific contact; shows in the contact's activity timeline
- **`dealId`** — links to a specific deal; shows in the deal's activity timeline
- Both can be set at once for activities that relate to a meeting about a specific contact within a deal

Linking is optional. Unlinked activities appear only in the global activity list.

---

## Due Dates

- `dueDate` is an optional ISO 8601 date-time string.
- Activities with a `dueDate` in the past that are not yet `done` appear in the "overdue" section of the activity list.
- The dashboard KPI "Activities Due" counts activities where `done: false` and `dueDate <= now`.

---

## Completing Activities

Mark an activity as done:

```
POST /api/activities/:id/done
```

This sets:
- `done: true`
- `doneAt: <current timestamp>`

And fires the `activity_completed` workflow trigger.

To undo completion, send `PUT /api/activities/:id` with `{ "done": false }`, which also clears `doneAt`.

---

## Activity Timeline

The `ActivityTimeline` component displays activities for a contact or deal in reverse chronological order. Each entry shows the type icon, subject, due date (if set), owner, and done status. Overdue uncompleted activities are highlighted.

---

## Validation Rules

### Create activity

| Field | Rule |
|---|---|
| `type` | Required, one of: `call`, `email`, `meeting`, `task`, `note` |
| `subject` | Required, 1–300 characters, trimmed |
| `description` | Optional, max 5000 characters |
| `dueDate` | Optional date string |
| `contactId` | Optional string (MongoDB ObjectId) |
| `dealId` | Optional string (MongoDB ObjectId) |

### Update activity

All fields are optional (partial update).

---

## RBAC Notes

- Sales reps see only their own activities.
- Managers and admins see all activities in the organization.
- Deleting activities requires `activities:delete` permission (sales reps do not have this).

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/activities` | List activities (paginated, filterable) |
| POST | `/api/activities` | Create a new activity |
| GET | `/api/activities/:id` | Get a single activity |
| PUT | `/api/activities/:id` | Update an activity |
| DELETE | `/api/activities/:id` | Delete an activity |
| POST | `/api/activities/:id/done` | Mark as done |

For external integrations, see the [REST API v1 reference](../api/rest-api.md).

---

## Related

- [Contacts](./contacts.md) — activities linked to contacts appear in the contact timeline
- [Deals](./deals.md) — activities linked to deals appear in the deal timeline
- [Automations](./automations.md) — `activity_completed` trigger
- [Reports](./reports.md) — activity counts in dashboard KPIs
