# Custom Fields

Custom fields let organizations define additional data fields for contacts, deals, and leads beyond the built-in fields. Field definitions are stored on the `Organization` document and values are stored in the `customFields` map on each entity record.

---

## Field Definition Model

Custom field definitions are stored in `organization.customFields.contacts`, `organization.customFields.deals`, and `organization.customFields.leads` as arrays.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | MongoDB ObjectId | Unique identifier |
| `name` | string | Required, max 64 | Internal key name — used as the key in `customFields` map. Must start with a lowercase letter; only lowercase letters, digits, and underscores allowed (e.g., `lead_score`, `region`) |
| `label` | string | Required, max 128 | Human-readable display label |
| `type` | string (enum) | Required | Field data type |
| `entityType` | string (enum) | Required, immutable after creation | Which entity this field belongs to |
| `required` | boolean | Default `false` | Whether this field is required when creating/editing an entity |
| `options` | string[] | Required for `select` and `multiselect` | Predefined options |
| `order` | number | Integer ≥ 0 | Display order in forms and detail views |

---

## Field Types

| Type | Description | Storage |
|---|---|---|
| `text` | Single-line free text | string |
| `number` | Numeric value | number |
| `date` | Date value | ISO date string |
| `select` | Single choice from predefined options | string |
| `multiselect` | Multiple choices from predefined options | string[] |
| `checkbox` | Boolean true/false | boolean |
| `url` | URL with format validation | string |
| `email` | Email address with format validation | string |
| `phone` | Phone number | string |

---

## Entity Types

| Value | Entity |
|---|---|
| `contacts` | Contact records |
| `deals` | Deal records |
| `leads` | Lead records |

The `entityType` of a field is immutable after creation. To move a field to a different entity, delete it and recreate it.

---

## Validation Rules

### Create custom field

| Field | Rule |
|---|---|
| `name` | Required, 1–64 chars, must match `/^[a-z][a-z0-9_]*$/` |
| `label` | Required, 1–128 chars |
| `type` | Required, one of the 9 type values |
| `entityType` | Required, one of `contacts`, `deals`, `leads` |
| `required` | Boolean, default `false` |
| `options` | Required (min 1 item) when type is `select` or `multiselect` |

### Update custom field

`name` and `entityType` are immutable and excluded from updates. All other fields are optional.

### Reorder fields

```
POST /api/settings/custom-fields/reorder
{
  "items": [
    { "id": "<fieldId>", "order": 0 },
    { "id": "<fieldId>", "order": 1 }
  ]
}
```

At least one item is required.

---

## Runtime Value Validation

When saving an entity with custom field values, the `validateCustomFieldValues` function validates each value against its field definition:

| Type | Validation applied |
|---|---|
| `number` | Must be a valid number |
| `date` | Must be a parseable date string |
| `email` | Must be a valid email address |
| `url` | Must be a valid URL |
| `select` | Must be one of the field's allowed options |
| `multiselect` | Must be an array; all items must be in the field's allowed options |
| `checkbox` | Must be a boolean |
| `text`, `phone` | No additional format validation |

Required fields produce an error if their value is empty, null, or undefined.

---

## Storing Values

Custom field values are stored in the `customFields` map on each entity:

```json
{
  "firstName": "Anna",
  "lastName": "Müller",
  "customFields": {
    "lead_score": 85,
    "region": "DACH",
    "newsletter_opt_in": true
  }
}
```

The key in `customFields` matches the field's `name` property. For example, a field with `name: "lead_score"` stores its value at `customFields.lead_score`.

---

## Rendering in Forms

The `CustomFieldRenderer` component (`components/shared/CustomFieldRenderer.tsx`) renders custom fields dynamically based on their type:

| Type | Rendered as |
|---|---|
| `text`, `url`, `email`, `phone` | Text input |
| `number` | Number input |
| `date` | Date picker |
| `select` | MUI Select dropdown |
| `multiselect` | MUI Autocomplete (multiple) |
| `checkbox` | Checkbox |

Required fields show validation errors in the form if left empty.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings/custom-fields` | List custom fields (all entities or filtered by `?entityType=...`) |
| POST | `/api/settings/custom-fields` | Create a custom field |
| GET | `/api/settings/custom-fields/:id` | Get a custom field |
| PUT | `/api/settings/custom-fields/:id` | Update a custom field |
| DELETE | `/api/settings/custom-fields/:id` | Delete a custom field |
| POST | `/api/settings/custom-fields/reorder` | Reorder fields |

---

## Related

- [Contacts](./contacts.md) — custom fields on contacts
- [Deals](./deals.md) — custom fields on deals
- [Leads](./leads.md) — custom fields on leads
- [Settings](./settings.md) — custom field management UI
