import { z } from 'zod'
import { API_KEY_PERMISSIONS } from '@/types/apiKey'

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').trim(),
  permissions: z
    .array(z.enum(API_KEY_PERMISSIONS))
    .min(1, 'At least one permission is required')
    .max(API_KEY_PERMISSIONS.length),
  expiresAt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'expiresAt must be a valid date string',
    })
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'expiresAt must be in the future',
    }),
})

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>
