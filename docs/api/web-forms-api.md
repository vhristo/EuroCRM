# Web Forms API

The public web forms API allows external websites to render and submit EuroCRM web forms. These endpoints require no authentication and support cross-origin requests from any domain.

---

## Base URL

```
https://your-eurocrm.com/api/public/forms
```

---

## CORS

Both endpoints return permissive CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

An `OPTIONS` preflight request returns HTTP 204 with these headers and no body.

---

## Get Form Definition

Retrieve the public-facing form structure for rendering.

```
GET /api/public/forms/:slug
```

### Parameters

| Parameter | Description |
|---|---|
| `:slug` | The form's URL slug (set when creating the form in EuroCRM) |

### Response

HTTP 200 — the form definition:

```json
{
  "id": "65f3a1b2c3d4e5f6a7b8c9d6",
  "name": "Contact Us",
  "slug": "contact-us",
  "description": "Get in touch with our sales team.",
  "fields": [
    {
      "id": "field_1",
      "name": "fullName",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "options": [],
      "order": 0,
      "mapTo": "name"
    },
    {
      "id": "field_2",
      "name": "workEmail",
      "label": "Work Email",
      "type": "email",
      "required": true,
      "options": [],
      "order": 1,
      "mapTo": "email"
    },
    {
      "id": "field_3",
      "name": "companyName",
      "label": "Company",
      "type": "text",
      "required": false,
      "options": [],
      "order": 2,
      "mapTo": "company"
    },
    {
      "id": "field_4",
      "name": "interest",
      "label": "Area of Interest",
      "type": "select",
      "required": false,
      "options": ["Sales", "Support", "Partnership"],
      "order": 3,
      "mapTo": null
    }
  ],
  "styling": {
    "primaryColor": "#1976d2",
    "backgroundColor": "#ffffff",
    "buttonText": "Get in Touch"
  },
  "successMessage": "Thank you! Our team will reach out within 24 hours."
}
```

Note: The response does not include `organizationId`, `submissions`, or any internal identifiers beyond `id`.

### Error responses

| Status | Body | Cause |
|---|---|---|
| 404 | `{ "error": "Form not found or inactive" }` | Slug does not exist, or form has `active: false` |

---

## Submit a Form

Submit data to create a lead in EuroCRM.

```
POST /api/public/forms/:slug
Content-Type: application/json
```

### Request body

The request body must be a JSON object where the keys are the field `name` values from the form definition.

For the example form above:

```json
{
  "fullName": "Anna Müller",
  "workEmail": "anna@acme.de",
  "companyName": "ACME GmbH",
  "interest": "Sales"
}
```

### Validation

The submission is validated against each field's definition:

| Field type | Validation |
|---|---|
| `email` | Must be a valid email address |
| `phone` | Must match `/^[+\d\s\-().]{5,30}$/` |
| `textarea` | Max 2000 characters |
| `select` | Must be one of the field's defined options |
| `text` | Max 500 characters |
| Required fields | Must be non-empty |

### Response

**HTTP 201 — success:**

```json
{
  "success": true,
  "message": "Thank you! Our team will reach out within 24 hours."
}
```

The `message` value is the form's configured `successMessage`.

**HTTP 400 — validation error:**

```json
{
  "error": {
    "fieldErrors": {
      "workEmail": ["Invalid email address"],
      "fullName": ["Full Name is required"]
    },
    "formErrors": []
  }
}
```

**HTTP 404 — form not found or inactive:**

```json
{ "error": "Form not found or inactive" }
```

---

## Lead Creation Behavior

On a successful submission, EuroCRM:

1. Maps field values to lead fields according to each field's `mapTo` configuration:
   - `mapTo: "name"` → lead's `name`
   - `mapTo: "email"` → lead's `email`
   - `mapTo: "phone"` → lead's `phone`
   - `mapTo: "company"` → lead's `company`
   - `mapTo: "notes"` → lead's `notes`
   - `mapTo: null` → appended to notes as `"Label: value"`

2. Creates a lead with:
   - `source: "website"`
   - `status: "new"`
   - `ownerId` set to the first admin user of the organization

3. Increments the form's `submissions` counter

---

## JavaScript Integration Example

Render and submit an EuroCRM form without a page reload:

```html
<div id="eurocrm-contact-form"></div>

<script>
async function loadEuroCRMForm(slug, containerId) {
  const container = document.getElementById(containerId)

  // Fetch form definition
  const res = await fetch(`https://your-eurocrm.com/api/public/forms/${slug}`)
  if (!res.ok) { container.textContent = 'Form unavailable.'; return }
  const form = await res.json()

  // Build form HTML
  const formEl = document.createElement('form')
  formEl.id = 'eurocrm-form'
  formEl.style.backgroundColor = form.styling.backgroundColor

  form.fields
    .sort((a, b) => a.order - b.order)
    .forEach(field => {
      const label = document.createElement('label')
      label.textContent = field.label + (field.required ? ' *' : '')

      let input
      if (field.type === 'select') {
        input = document.createElement('select')
        input.name = field.name
        field.options.forEach(opt => {
          const option = document.createElement('option')
          option.value = opt
          option.textContent = opt
          input.appendChild(option)
        })
      } else if (field.type === 'textarea') {
        input = document.createElement('textarea')
        input.name = field.name
        input.rows = 4
      } else {
        input = document.createElement('input')
        input.type = field.type === 'email' ? 'email' : 'text'
        input.name = field.name
      }

      if (field.required) input.required = true

      const div = document.createElement('div')
      div.appendChild(label)
      div.appendChild(input)
      formEl.appendChild(div)
    })

  const button = document.createElement('button')
  button.type = 'submit'
  button.textContent = form.styling.buttonText
  button.style.backgroundColor = form.styling.primaryColor
  formEl.appendChild(button)

  const successDiv = document.createElement('div')
  successDiv.id = 'eurocrm-success'
  successDiv.style.display = 'none'
  successDiv.textContent = form.successMessage

  container.appendChild(formEl)
  container.appendChild(successDiv)

  // Handle submission
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(formEl))

    const submitRes = await fetch(
      `https://your-eurocrm.com/api/public/forms/${slug}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    const result = await submitRes.json()
    if (result.success) {
      formEl.style.display = 'none'
      successDiv.style.display = 'block'
    } else {
      console.error('Validation errors:', result.error)
    }
  })
}

loadEuroCRMForm('contact-us', 'eurocrm-contact-form')
</script>
```

---

## iFrame Embed

For simpler integration, use an iFrame. The EuroCRM app serves form pages at:

```
https://your-eurocrm.com/api/public/forms/:slug
```

```html
<iframe
  src="https://your-eurocrm.com/api/public/forms/contact-us"
  width="100%"
  height="500"
  frameborder="0"
  title="Contact Us"
></iframe>
```

---

## Related

- [Web Forms feature](../features/web-forms.md) — creating and configuring forms in EuroCRM
- [Leads](../features/leads.md) — submissions create leads
- [Automations](../features/automations.md) — `form_submitted` trigger
