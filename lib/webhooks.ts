import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import Webhook from '@/models/Webhook'
import WebhookDelivery from '@/models/WebhookDelivery'

const MAX_FAILURES = 10
const DELIVERY_TIMEOUT_MS = 10_000

/**
 * Sign a webhook payload using HMAC-SHA256.
 * Returns the hex digest prefixed with "sha256=" for easy header inclusion.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

/**
 * Fire webhooks for the given event to all active subscribers in the organization.
 * This is fire-and-forget from the caller's perspective — errors are logged and recorded
 * but do not propagate. Webhooks that fail >= MAX_FAILURES times are automatically disabled.
 */
export async function fireWebhooks(
  organizationId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await connectDB()

    const webhooks = await Webhook.find({
      organizationId,
      active: true,
      events: event,
    }).lean<Record<string, unknown>[]>()

    if (webhooks.length === 0) return

    const payload = JSON.stringify({
      event,
      organizationId,
      data,
      timestamp: new Date().toISOString(),
    })

    // Deliver to all subscribers concurrently — do not block on individual failures
    await Promise.allSettled(
      webhooks.map((webhook) => deliverWebhook(webhook, event, payload, data))
    )
  } catch (error: unknown) {
    console.error('[fireWebhooks] Failed to query webhooks:', error)
  }
}

async function deliverWebhook(
  webhook: Record<string, unknown>,
  event: string,
  payload: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhookId = (webhook._id as { toString(): string }).toString()
  const organizationId = (webhook.organizationId as { toString(): string }).toString()
  const url = webhook.url as string
  const secret = webhook.secret as string

  const signature = signWebhookPayload(payload, secret)

  let responseStatus: number | undefined
  let responseBody: string | undefined
  let success = false
  let errorMessage: string | undefined

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-EuroCRM-Event': event,
        'X-EuroCRM-Delivery': webhookId,
      },
      body: payload,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    responseStatus = response.status
    responseBody = (await response.text()).slice(0, 10000)
    success = response.ok
  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : String(err)
    success = false
  }

  // Persist delivery record
  try {
    await WebhookDelivery.create({
      webhookId,
      organizationId,
      event,
      payload: data,
      responseStatus,
      responseBody,
      success,
      error: errorMessage,
      deliveredAt: new Date(),
    })
  } catch (err: unknown) {
    console.error('[fireWebhooks] Failed to create delivery record:', err)
  }

  // Update the webhook's failure count and lastDeliveryAt
  try {
    if (success) {
      await Webhook.findByIdAndUpdate(webhookId, {
        $set: { failureCount: 0, lastDeliveryAt: new Date() },
      })
    } else {
      const currentFailures = (webhook.failureCount as number) ?? 0
      const newFailureCount = currentFailures + 1

      const update: Record<string, unknown> = {
        $set: { lastDeliveryAt: new Date() },
        $inc: { failureCount: 1 },
      }

      if (newFailureCount >= MAX_FAILURES) {
        console.warn(
          `[fireWebhooks] Disabling webhook ${webhookId} after ${newFailureCount} failures`
        )
        ;(update.$set as Record<string, unknown>).active = false
      }

      await Webhook.findByIdAndUpdate(webhookId, update)
    }
  } catch (err: unknown) {
    console.error('[fireWebhooks] Failed to update webhook status:', err)
  }
}
