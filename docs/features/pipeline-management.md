# Pipeline Management

Pipelines are the core of the EuroCRM sales workflow. Each pipeline contains an ordered set of stages, and deals move through those stages on a Kanban board.

---

## Multi-Pipeline Support

An organization can have multiple named pipelines — for example, one for inbound sales, one for enterprise accounts, and one for renewals. One pipeline is marked as the default and is shown first in the Kanban view and pipeline selector.

Each pipeline belongs to exactly one organization (`organizationId`) and is never visible to other organizations.

---

## Pipeline Data Model

| Field | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId |
| `organizationId` | string | Owning organization |
| `name` | string | Pipeline display name (max 200 chars) |
| `stages` | Stage[] | Ordered array of stage objects |
| `isDefault` | boolean | Whether this is the default pipeline |
| `createdAt` | string (ISO 8601) | Creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

### Stage Object

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | Required | Unique identifier for the stage (UUID or slug) |
| `name` | string | Max 100 chars | Display name |
| `order` | number | Integer ≥ 0 | Sort order within the pipeline |
| `probability` | number | Integer 0–100 | Default win probability (%) for deals in this stage |
| `rotDays` | number | Integer ≥ 0 | Number of days before a deal in this stage is considered "rotten". Set to 0 to disable rotting for a stage. |

---

## Validation Rules

When creating or updating a pipeline:

- `name`: required, 1–200 characters, trimmed
- `stages[].id`: required string
- `stages[].name`: required, 1–100 characters, trimmed
- `stages[].order`: required integer ≥ 0
- `stages[].probability`: integer 0–100
- `stages[].rotDays`: integer ≥ 0, defaults to 0

---

## Kanban Board

The pipeline view renders deals grouped by stage in a drag-and-drop Kanban board (powered by `@hello-pangea/dnd`). Each column represents one stage.

**Drag behavior:** Dragging a deal card from one column to another calls `PUT /api/deals/:id/stage`, which:
1. Updates the deal's `stage` field
2. Resets `stageEnteredAt` to the current time
3. Clears `rottenSince` (the deal is fresh in its new stage)
4. Triggers the `deal_stage_changed` workflow event

**Pipeline selector:** A dropdown at the top of the Kanban page allows switching between pipelines. The default pipeline is shown first.

---

## Deal Rotting

Deal rotting detects deals that have been stuck in a stage longer than the stage's configured `rotDays` threshold.

- When `rotDays` is set to a positive number and a deal has been in that stage for longer than `rotDays` days without moving, the deal is marked as rotten.
- The `rottenSince` field on the deal records when rotting began.
- Rotten deals are visually flagged on their Kanban card (typically with a warning color or icon).
- Moving a deal to a new stage resets `rottenSince` to `null`.
- Setting `rotDays = 0` on a stage disables rotting detection for that stage.

The background check is exposed at `POST /api/deals/check-rotting`, which iterates open deals and sets `rottenSince` for any that qualify.

---

## Default Pipeline

- Only one pipeline per organization can be `isDefault: true`.
- When a new pipeline is marked as default (`POST /api/pipeline/:id/default`), all other pipelines in the organization have `isDefault` set to `false`.
- When creating a new deal, the frontend pre-selects the default pipeline.

---

## API Routes (Internal)

These routes require a valid Bearer JWT token (internal app use).

| Method | Path | Description |
|---|---|---|
| GET | `/api/pipeline` | List all pipelines for the organization |
| POST | `/api/pipeline` | Create a new pipeline |
| GET | `/api/pipeline/:id` | Get a single pipeline |
| PUT | `/api/pipeline/:id` | Update name and/or stages |
| DELETE | `/api/pipeline/:id` | Delete a pipeline |
| POST | `/api/pipeline/:id/default` | Set this pipeline as default |

See also the [REST API v1 reference](../api/rest-api.md) for external API access to pipelines.

---

## Related

- [Deals](./deals.md) — deals belong to a pipeline and a stage
- [Automations](./automations.md) — `deal_stage_changed` and `deal_created` triggers
- [Settings](./settings.md) — pipeline management in the settings UI
