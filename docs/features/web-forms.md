# Web Forms

Web forms are publicly embeddable forms that automatically create leads in EuroCRM when submitted. They are accessible without authentication via a unique slug URL, and can be embedded in any external website.

---

## Form Data Model

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | — | MongoDB ObjectId |
| `organizationId` | string | — | Owning organization |
| `name` | string | Required, max 200 | Internal form name |
| `slug` | string | Required, unique globally, lowercase | URL-safe identifier used in the public endpoint |
| `description` | string | Optional, max 1000 | Optional description shown above the form |
| `fields` | Field[] | 1–20 fields | Ordered list of form fields |
| `styling` | Styling object | — | Visual customization |
| `successMessage` | string | Max 500, default "Thank you! We will be in touch shortly." | Message shown after successful submission |
| `active` | boolean | Default `true` | Whether the form accepts submissions |
| `submissions` | number | — | Running count of successful submissions |
| `createdAt` | string (ISO 8601) | — | Creation timestamp |
| `updatedAt` | string (ISO 8601) | — | Last update timestamp |

### Styling Object

| Field | Type | Default | Description |
|---|---|---|---|
| `primaryColor` | string (hex) | `#1976d2` | Button and accent color |
| `backgroundColor` | string (hex) | `#ffffff` | Form background color |
| `buttonText` | string (max 50) | `Submit` | Submit button label |

---

## Form Fields

Each field in the `fields` array:

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | string | Required | Unique identifier for this field |
| `name` | string | Max 100 | Internal field name (used as form key) |
| `label` | string | Max 200 | Display label |
| `type` | string (enum) | Required | Field type |
| `required` | boolean | Default `false` | Whether the field must be filled |
| `options` | string[] | Optional | Dropdown options for `select` type |
| `order` | number | Integer ≥ 0 | Display order |
| `mapTo` | string (enum) \| null | Optional | Maps submission value to a lead field |

### Field Types

| Value | Description |
|---|---|
| `text` | Single-line text input |
| `email` | Email input with format validation |
| `phone` | Phone number input (validated against `/^[+\d\s\-().]{5,30}$/`) |
| `textarea` | Multi-line text (max 2000 chars) |
| `select` | Dropdown with predefined options |

### Field Mapping (`mapTo`)

The `mapTo` property controls which Lead field receives the submitted value:

| `mapTo` value | Lead field |
|---|---|
| `name` | `name` |
| `email` | `email` |
| `phone` | `phone` |
| `company` | `company` |
| `notes` | `notes` |
| `null` | Appended to notes as "Label: value" |

Fields without a `mapTo` mapping are appended to the lead's `notes` field in `"Label: value"` format.

---

## Validation Rules

### Create form

| Field | Rule |
|---|---|
| `name` | Required, max 200 |
| `description` | Optional, max 1000 |
| `fields` | 1–20 fields, each valid per field schema |
| `styling.primaryColor` | Valid hex color (e.g., `#1976d2` or `#abc`) |
| `styling.backgroundColor` | Valid hex color |
| `styling.buttonText` | 1–50 characters |
| `successMessage` | 1–500 characters |
| `active` | Boolean |

---

## Public Submission Endpoint

See [Web Forms API](../api/web-forms-api.md) for the complete public API reference.

The public endpoint is unauthenticated and CORS-enabled to allow submissions from any origin.

---

## Submission Behavior

When a form is submitted:

1. The submission is validated against the form's field definitions (required checks, type-specific validation)
2. Mapped fields are applied to the Lead document
3. Unmapped fields are concatenated into the lead's `notes` field
4. A new Lead is created with `source: 'website'`, `status: 'new'`
5. The `submissions` counter on the form is incremented
6. The public endpoint returns `{ success: true, message: "<successMessage>" }`

The lead is assigned to the first admin user in the organization. If no admin exists, the `organizationId` is used as a fallback `ownerId`.

---

## Embed Code

After creating a form, retrieve its embed code from the settings UI or via:

```
GET /api/web-forms/:id/embed
```

### iFrame embed

```html
<iframe
  src="https://your-eurocrm.com/api/public/forms/your-slug"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

### JavaScript snippet

```html
<div id="eurocrm-form"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = 'https://your-eurocrm.com/api/public/forms/your-slug';
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    document.getElementById('eurocrm-form').appendChild(iframe);
  })();
</script>
```

---

## CORS Support

The public form endpoints include permissive CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

A `OPTIONS` preflight response is handled automatically.

---

## Deactivating a Form

Set `active: false` via `PUT /api/web-forms/:id` to stop accepting submissions. Inactive forms return HTTP 404 at the public endpoint.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/web-forms` | List all web forms |
| POST | `/api/web-forms` | Create a web form |
| GET | `/api/web-forms/:id` | Get a web form |
| PUT | `/api/web-forms/:id` | Update a web form |
| DELETE | `/api/web-forms/:id` | Delete a web form |
| GET | `/api/web-forms/:id/embed` | Get embed code |

Public endpoints (no authentication):

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/forms/:slug` | Get public form definition |
| POST | `/api/public/forms/:slug` | Submit the form |

---

## Related

- [Leads](./leads.md) — web form submissions create leads
- [Automations](./automations.md) — `form_submitted` trigger
- [Web Forms API](../api/web-forms-api.md) — full public API reference
