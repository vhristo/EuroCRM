import { z } from 'zod'
import { WEBHOOK_EVENTS } from '@/types/webhook'

export const CreateWebhookSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine(
      (val) => val.startsWith('https://') || val.startsWith('http://'),
      { message: 'URL must start with http:// or https://' }
    ),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'At least one event is required'),
  active: z.boolean().optional().default(true),
})

export const UpdateWebhookSchema = CreateWebhookSchema.partial()

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>
