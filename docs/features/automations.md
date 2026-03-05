# Automations (Workflows)

Workflows automate repetitive CRM tasks by reacting to events in the system. Each workflow defines a trigger, optional conditions, and one or more actions to execute.

---

## Concepts

```
[Trigger fires] → [All conditions pass?] → [Execute actions sequentially]
```

- **Trigger**: An event in the system that starts the workflow evaluation
- **Conditions**: Optional filters that must ALL pass (AND logic) for the workflow to execute
- **Actions**: Ordered list of things to do when the workflow fires
- **Execution log**: Each workflow run is recorded with per-action success/failure details

Workflows run **fire-and-forget** from the API route that triggered them. Errors in workflow execution do not affect the original API operation.

---

## Workflow Data Model

| Field | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Owning organization |
| `name` | string | Workflow name (max 100 chars) |
| `description` | string | Optional description (max 500 chars) |
| `trigger` | string (enum) | The triggering event |
| `conditions` | Condition[] | Optional conditions (AND logic) |
| `actions` | Action[] | At least one action required |
| `active` | boolean | Whether this workflow is enabled |
| `executionCount` | number | Total number of times this workflow has run |
| `lastExecutedAt` | string (ISO 8601) | Last execution time |
| `createdBy` | string | User who created the workflow |
| `createdAt` | string (ISO 8601) | — |
| `updatedAt` | string (ISO 8601) | — |

---

## Available Triggers

| Trigger | Fires when... |
|---|---|
| `deal_created` | A new deal is created |
| `deal_stage_changed` | A deal is moved to a different stage |
| `deal_won` | A deal's status is set to `won` |
| `deal_lost` | A deal's status is set to `lost` |
| `contact_created` | A new contact is created |
| `lead_created` | A new lead is created |
| `lead_converted` | A lead is converted to a contact and deal |
| `activity_completed` | An activity is marked as done |
| `form_submitted` | A public web form is submitted (creates a lead) |

---

## Conditions

Conditions filter whether the workflow should execute for a given entity. All conditions must pass (AND logic).

### Condition Object

| Field | Type | Description |
|---|---|---|
| `field` | string | Field path on the entity (supports dot notation for nested fields) |
| `operator` | string (enum) | Comparison operator |
| `value` | string \| number \| boolean | Value to compare against (not needed for `is_set`/`is_not_set`) |

### Condition Operators

| Operator | Description |
|---|---|
| `equals` | Field value equals the condition value (loose equality) |
| `not_equals` | Field value does not equal the condition value |
| `contains` | String contains substring, or array contains value (case-insensitive for strings) |
| `greater_than` | Numeric field is greater than the value |
| `less_than` | Numeric field is less than the value |
| `is_set` | Field has a non-null, non-empty value |
| `is_not_set` | Field is null, undefined, or empty string |

### Special Field: `previousStage`

For `deal_stage_changed` triggers, use `field: "previousStage"` to match against the stage the deal moved **from**.

### Example Conditions

```json
[
  { "field": "status", "operator": "equals", "value": "open" },
  { "field": "value", "operator": "greater_than", "value": 100000 }
]
```

```json
[
  { "field": "previousStage", "operator": "equals", "value": "lead" },
  { "field": "stage", "operator": "equals", "value": "proposal" }
]
```

---

## Available Actions

Each action has a `type` and a `config` object whose properties depend on the type.

### `create_activity`

Creates an activity linked to the triggering entity.

| Config Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Activity type: `call`, `email`, `meeting`, `task`, `note` |
| `subject` | string | Yes | Subject line (supports template variables) |
| `description` | string | No | Description (supports template variables) |
| `ownerId` | string | No | Owner of the new activity; defaults to entity's ownerId |

### `send_email`

Sends an email (requires SMTP configuration). Template variables are supported.

| Config Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient address (supports template variables, e.g., `{{email}}`) |
| `subject` | string | Yes | Email subject (supports template variables) |
| `body` | string | No | Email body (supports template variables) |

### `update_field`

Sets a field on the triggering entity.

| Config Field | Type | Required | Description |
|---|---|---|---|
| `field` | string | Yes | Field name to update |
| `value` | unknown | No | New value (supports template variables if string) |

### `assign_owner`

Reassigns the entity to a different user.

| Config Field | Type | Required | Description |
|---|---|---|---|
| `ownerId` | string | Yes | ID of the user to assign as owner |

### `add_tag`

Appends a tag to the entity's `tags` array (contacts and leads only).

| Config Field | Type | Required | Description |
|---|---|---|---|
| `tag` | string | Yes | Tag to add (supports template variables) |

### `send_webhook`

POSTs the entity payload to an external URL with a 10-second timeout.

| Config Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Destination URL |

The payload sent is:

```json
{
  "trigger": "deal_created",
  "organizationId": "...",
  "entity": { ... },
  "sentAt": "2026-03-05T10:00:00.000Z"
}
```

---

## Template Variables

Template variables substitute entity field values into string configs. Use `{{fieldName}}` syntax, with dot notation for nested fields:

| Variable | Resolves to |
|---|---|
| `{{firstName}}` | Contact/entity's firstName |
| `{{lastName}}` | Contact/entity's lastName |
| `{{email}}` | Entity's email |
| `{{title}}` | Deal's title |
| `{{stage}}` | Deal's current stage |
| `{{value}}` | Deal's value in cents |
| `{{name}}` | Lead's name |
| `{{source}}` | Lead's source |
| `{{subject}}` | Activity's subject |

Unmatched variables are replaced with an empty string.

---

## Enabling and Disabling

Toggle a workflow on or off without deleting it:

```
POST /api/workflows/:id/toggle
```

Returns the updated workflow with the new `active` value.

---

## Execution Log

Every workflow run creates a `WorkflowExecution` document.

| Field | Type | Description |
|---|---|---|
| `workflowId` | string | Which workflow ran |
| `trigger` | string | Which trigger fired |
| `entityType` | string | `deal`, `contact`, `lead`, or `activity` |
| `entityId` | string | ID of the triggering entity |
| `status` | `success` \| `partial_failure` \| `failure` | Overall outcome |
| `results` | Result[] | Per-action outcome |
| `executedAt` | string (ISO 8601) | When the workflow ran |

### Result Object

| Field | Description |
|---|---|
| `action` | Action type string |
| `success` | Whether this action succeeded |
| `error` | Error message if the action failed |

### TTL

Execution logs are **automatically deleted after 90 days** via a MongoDB TTL index on `executedAt`.

### Viewing Logs

```
GET /api/workflows/:id/executions
```

Returns a paginated list of recent executions for a workflow.

---

## Validation Rules

### Create workflow

| Field | Rule |
|---|---|
| `name` | Required, max 100 chars |
| `description` | Optional, max 500 chars |
| `trigger` | Required, one of the trigger enum values |
| `conditions` | Array of condition objects (default empty) |
| `actions` | Array with at least one action |
| `active` | Boolean, default `true` |

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create a workflow |
| GET | `/api/workflows/:id` | Get a workflow |
| PUT | `/api/workflows/:id` | Update a workflow |
| DELETE | `/api/workflows/:id` | Delete a workflow |
| POST | `/api/workflows/:id/toggle` | Enable/disable |
| GET | `/api/workflows/:id/executions` | View execution log |

---

## Related

- [Deals](./deals.md) — deal triggers
- [Contacts](./contacts.md) — contact_created trigger
- [Leads](./leads.md) — lead triggers
- [Activities](./activities.md) — activity_completed trigger
- [Web Forms](./web-forms.md) — form_submitted trigger
- [Email](./email.md) — send_email action requires SMTP configuration
