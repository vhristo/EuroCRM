import mongoose, { Schema, Document, Types } from 'mongoose'

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

export interface IWebhookDeliveryDocument
  extends Omit<
      IWebhookDelivery,
      'id' | 'webhookId' | 'organizationId' | 'deliveredAt'
    >,
    Document {
  webhookId: Types.ObjectId
  organizationId: Types.ObjectId
  deliveredAt: Date
}

const webhookDeliverySchema = new Schema<IWebhookDeliveryDocument>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    responseStatus: {
      type: Number,
    },
    responseBody: {
      type: String,
      maxlength: 10000,
    },
    success: {
      type: Boolean,
      required: true,
    },
    error: {
      type: String,
    },
    deliveredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    // No timestamps: true — we use deliveredAt as the single timestamp
    timestamps: false,
  }
)

// TTL index: automatically delete delivery logs after 30 days
webhookDeliverySchema.index({ deliveredAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })
webhookDeliverySchema.index({ webhookId: 1, organizationId: 1 })
webhookDeliverySchema.index({ organizationId: 1, deliveredAt: -1 })

const WebhookDelivery =
  mongoose.models.WebhookDelivery ??
  mongoose.model<IWebhookDeliveryDocument>('WebhookDelivery', webhookDeliverySchema)

export default WebhookDelivery
