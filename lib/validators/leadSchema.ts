import { z } from 'zod'

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  email: z.string().email().toLowerCase().trim().optional().or(z.literal('')),
  phone: z.string().max(50).trim().optional().or(z.literal('')),
  company: z.string().max(200).trim().optional().or(z.literal('')),
  source: z
    .enum(['website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'trade_show', 'other'])
    .default('other'),
  status: z
    .enum(['new', 'contacted', 'qualified', 'unqualified', 'converted'])
    .default('new'),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export const UpdateLeadSchema = CreateLeadSchema.partial()

export const ConvertLeadSchema = z.object({
  dealTitle: z.string().min(1).max(300).trim(),
  dealValue: z.number().int().min(0),
  currency: z.string().length(3).default('EUR'),
  pipelineId: z.string().min(1),
  stage: z.string().min(1),
})

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>
export type ConvertLeadInput = z.infer<typeof ConvertLeadSchema>
