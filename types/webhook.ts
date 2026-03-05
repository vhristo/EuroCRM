export interface IWebhook {
  id: string
  organizationId: string
  url: string
  secret: string // HMAC-SHA256 signing secret (shown only on creation)
  events: string[] // e.g., ['contact.created', 'deal.won']
  active: boolean
  failureCount: number
  lastDeliveryAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IWebhookDelivery {
  id: string
  webhookId: string
  organizationId: string
  event: string
  payload: Record<string, unknown>
  responseStatus?: number
  responseBody?: string
  success: boolean
  error?: string
  deliveredAt: string
}

export const WEBHOOK_EVENTS = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'deal.created',
  'deal.updated',
  'deal.won',
  'deal.lost',
  'deal.deleted',
  'lead.created',
  'lead.updated',
  'lead.converted',
  'lead.deleted',
  'activity.created',
  'activity.completed',
  'activity.deleted',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]
