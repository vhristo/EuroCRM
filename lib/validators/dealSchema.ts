import { z } from 'zod'

export const CreateDealSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  value: z
    .number({ required_error: 'Value is required', invalid_type_error: 'Value must be a number' })
    .int('Value must be an integer (cents)')
    .min(0, 'Value must be 0 or greater'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-character ISO code')
    .default('EUR'),
  stage: z.string().min(1, 'Stage is required'),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  contactId: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'expectedCloseDate must be a valid date string',
    }),
  notes: z.string().optional(),
})

export type CreateDealInput = z.infer<typeof CreateDealSchema>

export const UpdateDealSchema = CreateDealSchema.partial().extend({
  status: z.enum(['open', 'won', 'lost']).optional(),
  lostReason: z.string().max(1000).optional(),
})

export type UpdateDealInput = z.infer<typeof UpdateDealSchema>

export const MoveDealStageSchema = z.object({
  stage: z.string().min(1, 'Stage is required'),
  probability: z.number().int().min(0).max(100).optional(),
})

export type MoveDealStageInput = z.infer<typeof MoveDealStageSchema>
