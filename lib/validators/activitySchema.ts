import { z } from 'zod'

export const CreateActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task', 'note']),
  subject: z.string().min(1, 'Subject is required').max(300).trim(),
  description: z.string().max(5000).optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  contactId: z.string().optional().or(z.literal('')),
  dealId: z.string().optional().or(z.literal('')),
})

export const UpdateActivitySchema = CreateActivitySchema.partial()

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>
export type UpdateActivityInput = z.infer<typeof UpdateActivitySchema>
