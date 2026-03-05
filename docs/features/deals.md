# Deals

Deals represent sales opportunities moving through a pipeline. Each deal has a monetary value, belongs to a pipeline stage, and can be linked to a contact.

---

## Deal Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization |
| `title` | string | Required, trimmed | Deal title |
| `value` | number | Required, integer ≥ 0 | Deal value **stored in cents** (e.g., 10000 = €100.00) |
| `currency` | string | 3-char ISO code, default `EUR` | Currency code |
| `stage` | string | Required | Current pipeline stage ID |
| `pipelineId` | string | Required | Pipeline this deal belongs to |
| `contactId` | string | Optional | Linked contact |
| `status` | `open` \| `won` \| `lost` | Default `open` | Deal lifecycle status |
| `probability` | number | Integer 0–100, default 0 | Win probability (%) |
| `expectedCloseDate` | string (ISO 8601) | Optional | Target close date |
| `rottenSince` | string (ISO 8601) \| null | — | When the deal became rotten; null if not rotten |
| `stageEnteredAt` | string (ISO 8601) | — | When the deal entered its current stage |
| `wonAt` | string (ISO 8601) | — | When the deal was marked won |
| `lostAt` | string (ISO 8601) | — | When the deal was marked lost |
| `lostReason` | string | Max 1000 chars | Reason for losing the deal |
| `notes` | string | Optional | Free-text notes |
| `ownerId` | string | Required | Owning user |
| `customFields` | Record<string, unknown> | — | Values for organization-defined custom fields |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

---

## Money Storage: Cents

**Deal values are always stored as integer cents.** This avoids floating-point precision issues.

| Stored value | Display value |
|---|---|
| `10000` | €100.00 |
| `99999` | €999.99 |
| `0` | €0.00 |

Use `formatCurrency(value, currency)` from `utils/formatters.ts` to display values in the UI. Never store or display raw decimal amounts.

---

## Deal Status Lifecycle

```
open  →  won
open  →  lost
```

- New deals start as `open`.
- Marking a deal as `won` sets `wonAt` to the current timestamp and fires the `deal_won` workflow trigger.
- Marking a deal as `lost` sets `lostAt` to the current timestamp, optionally records a `lostReason`, and fires the `deal_lost` workflow trigger.
- `won` and `lost` deals cannot be moved back to `open` through the stage API (update via `PUT /api/deals/:id` with `status: 'open'` if needed).

---

## Stage Management

Moving a deal between stages is a dedicated operation:

```
PUT /api/deals/:id/stage
{
  "stage": "proposal",
  "probability": 60
}
```

This endpoint:
1. Updates `stage` and optionally `probability`
2. Resets `stageEnteredAt` to the current time
3. Clears `rottenSince` (null)
4. Fires the `deal_stage_changed` workflow trigger with `previousStage` in the execution context

When moving a deal via drag-and-drop on the Kanban board, this endpoint is called automatically.

---

## Deal Rotting

A deal becomes "rotten" when it has not moved stages for longer than the stage's configured `rotDays` threshold.

- The `rottenSince` field is set when the deal first becomes rotten.
- Moving to a new stage resets `rottenSince` to `null`.
- The background rotting check is triggered by `POST /api/deals/check-rotting`.
- Rotten deals are flagged visually on the Kanban board.

A `rotDays` of `0` on a stage disables rotting for deals in that stage.

---

## Validation Rules

### Create deal

| Field | Rule |
|---|---|
| `title` | Required, trimmed |
| `value` | Required, integer ≥ 0 (cents) |
| `currency` | 3-character ISO code, default `EUR` |
| `stage` | Required string |
| `pipelineId` | Required string |
| `contactId` | Optional string |
| `probability` | Optional integer 0–100 |
| `expectedCloseDate` | Optional valid date string |

### Update deal

All create fields are optional. Additionally:

| Field | Rule |
|---|---|
| `status` | `open`, `won`, or `lost` |
| `lostReason` | Max 1000 characters |

---

## Pipeline Association

Every deal must belong to a pipeline (`pipelineId`) and have a `stage` that matches one of the pipeline's stage IDs. The frontend enforces this by only showing stages from the selected pipeline in the deal form.

---

## Contact Linking

A deal can be optionally linked to a contact via `contactId`. This link:
- Displays the contact's name on the deal card and detail view
- Shows the deal in the contact's deal list
- Allows activities to be linked to both the deal and its contact simultaneously

---

## Custom Fields

Custom fields for deals work identically to contact custom fields. See [Custom Fields](./custom-fields.md).

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/deals` | List deals (paginated, filterable) |
| POST | `/api/deals` | Create a new deal |
| GET | `/api/deals/:id` | Get a single deal |
| PUT | `/api/deals/:id` | Update a deal (including status) |
| DELETE | `/api/deals/:id` | Delete a deal |
| PUT | `/api/deals/:id/stage` | Move deal to a new stage |
| POST | `/api/deals/check-rotting` | Run rotting detection (background job) |

For external integrations, see the [REST API v1 reference](../api/rest-api.md).

---

## Related

- [Pipeline Management](./pipeline-management.md) — pipeline and stage configuration
- [Contacts](./contacts.md) — linking contacts to deals
- [Activities](./activities.md) — logging activities against a deal
- [Automations](./automations.md) — deal_created, deal_won, deal_lost, deal_stage_changed triggers
- [Reports](./reports.md) — deal-based analytics
