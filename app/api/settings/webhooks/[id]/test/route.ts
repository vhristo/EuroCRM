import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { signWebhookPayload } from '@/lib/webhooks'
import Webhook from '@/models/Webhook'
import WebhookDelivery from '@/models/WebhookDelivery'

type RouteContext = { params: Promise<{ id: string }> }

const TEST_TIMEOUT_MS = 10_000

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  try {
    await connectDB()

    const webhook = await Webhook.findOne({
      _id: id,
      organizationId: auth.organizationId,
    }).lean<Record<string, unknown>>()

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const testPayload = {
      event: 'test',
      organizationId: auth.organizationId,
      data: {
        message: 'This is a test webhook delivery from EuroCRM',
        webhookId: id,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }

    const payloadString = JSON.stringify(testPayload)
    const secret = webhook.secret as string
    const url = webhook.url as string
    const signature = signWebhookPayload(payloadString, secret)

    let responseStatus: number | undefined
    let responseBody: string | undefined
    let success = false
    let errorMessage: string | undefined

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-EuroCRM-Event': 'test',
          'X-EuroCRM-Delivery': id,
        },
        body: payloadString,
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

    // Record the test delivery
    await WebhookDelivery.create({
      webhookId: id,
      organizationId: auth.organizationId,
      event: 'test',
      payload: testPayload.data,
      responseStatus,
      responseBody,
      success,
      error: errorMessage,
      deliveredAt: new Date(),
    })

    return NextResponse.json({
      success,
      responseStatus: responseStatus ?? null,
      responseBody: responseBody ?? null,
      error: errorMessage ?? null,
    })
  } catch (error: unknown) {
    console.error('[POST /api/settings/webhooks/[id]/test]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
