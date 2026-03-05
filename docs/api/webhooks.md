# Webhooks

Webhooks deliver real-time notifications to your server when events occur in EuroCRM. Each delivery is an HTTP POST request to your configured URL, signed with HMAC-SHA256 for verification.

---

## Concepts

- You register a webhook endpoint URL and select which events to subscribe to
- When a matching event occurs, EuroCRM POSTs a JSON payload to your URL within the same request lifecycle (fire-and-forget — webhook failures do not affect the original operation)
- EuroCRM records each delivery attempt (success or failure) in the delivery log
- Webhooks that fail 10 or more times consecutively are automatically disabled

---

## Available Events

| Event | Fires when... |
|---|---|
| `contact.created` | A new contact is created |
| `contact.updated` | A contact's fields are updated |
| `contact.deleted` | A contact is deleted |
| `deal.created` | A new deal is created |
| `deal.updated` | A deal's fields are updated |
| `deal.won` | A deal is marked as won |
| `deal.lost` | A deal is marked as lost |
| `deal.deleted` | A deal is deleted |
| `lead.created` | A new lead is created |
| `lead.updated` | A lead's fields are updated |
| `lead.converted` | A lead is converted to a contact and deal |
| `lead.deleted` | A lead is deleted |
| `activity.created` | A new activity is created |
| `activity.completed` | An activity is marked as done |
| `activity.deleted` | An activity is deleted |

---

## Webhook Registration

Create a webhook via the Settings UI or the internal API:

```
POST /api/settings/webhooks
```

Request body:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `url` | string | Yes | Valid URL (http or https) |
| `events` | string[] | Yes | At least one event from the events list |
| `active` | boolean | No | Default `true` |

**Example:**

```bash
curl -X POST "https://your-eurocrm.com/api/settings/webhooks" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/eurocrm-webhook",
    "events": ["deal.won", "deal.lost", "contact.created"]
  }'
```

**Response:**

```json
{
  "id": "65f3a1b2c3d4e5f6a7b8c9d5",
  "url": "https://your-server.com/eurocrm-webhook",
  "events": ["deal.won", "deal.lost", "contact.created"],
  "secret": "whsec_a1b2c3d4e5f6...",
  "active": true,
  "failureCount": 0,
  "createdAt": "2026-03-05T10:00:00.000Z",
  "updatedAt": "2026-03-05T10:00:00.000Z"
}
```

**Save the `secret` — it is shown only once and cannot be retrieved afterwards.** Use it to verify incoming webhook signatures.

---

## Payload Format

Every webhook delivery is a POST request with `Content-Type: application/json` and the following body:

```json
{
  "event": "deal.won",
  "organizationId": "65f3a1b2c3d4e5f6a7b8c9d1",
  "data": {
    "id": "65f3a1b2c3d4e5f6a7b8c9d4",
    "title": "Enterprise License - ACME GmbH",
    "value": 1500000,
    "currency": "EUR",
    "status": "won",
    "wonAt": "2026-03-05T10:00:00.000Z",
    ...
  },
  "timestamp": "2026-03-05T10:00:00.000Z"
}
```

| Field | Description |
|---|---|
| `event` | The event name (e.g., `deal.won`) |
| `organizationId` | Your organization's ID |
| `data` | The full entity object that triggered the event |
| `timestamp` | ISO 8601 datetime of the event |

---

## Request Headers

EuroCRM sends these headers with every webhook delivery:

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | `sha256=<hmac_hex_digest>` |
| `X-EuroCRM-Event` | The event name |
| `X-EuroCRM-Delivery` | The webhook ID |

---

## HMAC-SHA256 Signature Verification

The `X-Webhook-Signature` header allows you to verify that a delivery genuinely came from EuroCRM and has not been tampered with.

### Algorithm

1. Get the raw request body as a string
2. Compute HMAC-SHA256 of the body using your webhook's `secret` as the key
3. Prefix the hex digest with `sha256=`
4. Compare against the `X-Webhook-Signature` header using a constant-time comparison

### Node.js example

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const expectedSignature = `sha256=${hmac.digest('hex')}`

  // Use timingSafeEqual to prevent timing attacks
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (sigBuffer.length !== expectedBuffer.length) return false
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
}

// In your webhook handler:
app.post('/eurocrm-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature']
  const secret = process.env.EUROCRM_WEBHOOK_SECRET

  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature')
  }

  const payload = JSON.parse(req.body)
  console.log('Event:', payload.event, payload.data)
  res.status(200).send('OK')
})
```

### Python example

```python
import hmac
import hashlib

def verify_webhook_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Always verify signatures.** Reject any delivery where the signature does not match.

---

## Retry Behavior

EuroCRM does **not** automatically retry failed webhook deliveries. If your endpoint is down or returns a non-2xx response, the delivery is marked as failed and the failure count is incremented.

To receive missed events, check the delivery log and re-trigger events manually if needed (or design your system to handle gaps).

---

## Failure Handling and Auto-Disable

- Each failed delivery increments `failureCount` on the webhook
- When `failureCount` reaches 10, the webhook is automatically set to `active: false`
- A disabled webhook receives no further deliveries until re-enabled
- To re-enable a disabled webhook, send `PUT /api/settings/webhooks/:id` with `{ "active": true }` — this also resets `failureCount` to 0

---

## Delivery Log

Every delivery attempt is recorded. View the last 50 deliveries for a webhook:

```
GET /api/settings/webhooks/:id/deliveries
```

Each delivery record includes:

| Field | Description |
|---|---|
| `event` | Event name |
| `success` | Whether the delivery was successful |
| `responseStatus` | HTTP status code from your server |
| `responseBody` | First 10,000 characters of your server's response |
| `error` | Network/timeout error if delivery failed at the transport level |
| `deliveredAt` | Timestamp of the delivery attempt |

---

## Testing Webhooks

Send a test delivery to your endpoint without triggering a real event:

```
POST /api/settings/webhooks/:id/test
```

The test payload:

```json
{
  "event": "test",
  "organizationId": "...",
  "data": {
    "message": "This is a test webhook delivery from EuroCRM",
    "webhookId": "...",
    "timestamp": "2026-03-05T10:00:00.000Z"
  },
  "timestamp": "2026-03-05T10:00:00.000Z"
}
```

The test is signed with the webhook's secret and recorded in the delivery log. Returns:

```json
{
  "success": true,
  "responseStatus": 200,
  "responseBody": "OK",
  "error": null
}
```

---

## Timeout

Webhook delivery has a 10-second timeout. Deliveries that exceed this limit are marked as failed.

---

## Updating a Webhook

```
PUT /api/settings/webhooks/:id
```

Accepts partial updates:

```json
{
  "url": "https://new-endpoint.example.com/hook",
  "events": ["contact.created", "deal.won"],
  "active": true
}
```

---

## Deleting a Webhook

```
DELETE /api/settings/webhooks/:id
```

Returns `{ "success": true }`. Delivery history is also deleted.

---

## Related

- [Settings — Webhooks](../features/settings.md#webhooks) — webhook management in the UI
- [REST API](./rest-api.md) — webhook events fired by v1 API operations
- [Automations](../features/automations.md) — `send_webhook` workflow action for custom HTTP calls
