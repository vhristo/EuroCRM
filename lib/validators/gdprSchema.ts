import { z } from 'zod'

export const CreateDataRequestSchema = z.object({
  type: z.enum(['export', 'erasure'], {
    required_error: 'Request type is required',
    invalid_type_error: 'Type must be either "export" or "erasure"',
  }),
  contactId: z
    .string({ required_error: 'contactId is required' })
    .min(1, 'contactId cannot be empty'),
})

export const ConfirmErasureSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({
      message: 'You must type DELETE to confirm erasure',
    }),
  }),
})

export type CreateDataRequestInput = z.infer<typeof CreateDataRequestSchema>
export type ConfirmErasureInput = z.infer<typeof ConfirmErasureSchema>
