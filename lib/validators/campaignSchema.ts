import { z } from 'zod'

export const RecipientFilterSchema = z.object({
  tags: z.array(z.string().max(50)).max(20).optional(),
  ownerId: z.string().optional(),
  country: z.string().max(100).trim().optional(),
})

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  subject: z.string().min(1, 'Subject is required').max(500).trim(),
  htmlBody: z.string().min(1, 'Email body is required'),
  textBody: z.string().optional(),
  recipientFilter: RecipientFilterSchema.default({}),
  scheduledAt: z.string().datetime().optional(),
})

export const UpdateCampaignSchema = CreateCampaignSchema.partial()

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>
export type RecipientFilterInput = z.infer<typeof RecipientFilterSchema>
