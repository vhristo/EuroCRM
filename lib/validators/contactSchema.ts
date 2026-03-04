import { z } from 'zod'

export const CreateContactSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim().optional().or(z.literal('')),
  phone: z.string().max(50).trim().optional().or(z.literal('')),
  company: z.string().max(200).trim().optional().or(z.literal('')),
  jobTitle: z.string().max(200).trim().optional().or(z.literal('')),
  country: z.string().max(100).trim().optional().or(z.literal('')),
  city: z.string().max(100).trim().optional().or(z.literal('')),
  address: z.string().max(500).trim().optional().or(z.literal('')),
  currency: z.string().length(3).default('EUR'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
