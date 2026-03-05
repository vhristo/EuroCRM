import { z } from 'zod'

export const WebFormFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1)).optional(),
  order: z.number().int().min(0),
  mapTo: z.enum(['name', 'email', 'phone', 'company', 'notes']).optional(),
})

const StylingSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,6}$/, 'Must be a valid hex color')
    .default('#1976d2'),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,6}$/, 'Must be a valid hex color')
    .default('#ffffff'),
  buttonText: z.string().min(1).max(50).default('Submit'),
})

export const CreateWebFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fields: z
    .array(WebFormFieldSchema)
    .min(1, 'At least one field is required')
    .max(20, 'Maximum 20 fields allowed'),
  styling: StylingSchema.default({
    primaryColor: '#1976d2',
    backgroundColor: '#ffffff',
    buttonText: 'Submit',
  }),
  successMessage: z
    .string()
    .min(1)
    .max(500)
    .default('Thank you! We will be in touch shortly.'),
  active: z.boolean().default(true),
})

export const UpdateWebFormSchema = CreateWebFormSchema.partial()

export type CreateWebFormInput = z.infer<typeof CreateWebFormSchema>
export type UpdateWebFormInput = z.infer<typeof UpdateWebFormSchema>
export type WebFormFieldInput = z.infer<typeof WebFormFieldSchema>

/**
 * Validates a form submission against the form's field definitions.
 * Returns a parsed key→value record or throws a ZodError.
 */
export function buildSubmissionSchema(
  fields: WebFormFieldInput[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Invalid email address')
        break
      case 'phone':
        fieldSchema = z.string().regex(/^[+\d\s\-().]{5,30}$/, 'Invalid phone number')
        break
      case 'textarea':
        fieldSchema = z.string().max(2000)
        break
      case 'select':
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]])
        } else {
          fieldSchema = z.string()
        }
        break
      default:
        fieldSchema = z.string().max(500)
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(''))
    } else if (fieldSchema instanceof z.ZodString) {
      fieldSchema = fieldSchema.min(1, `${field.label} is required`)
    }

    shape[field.name] = fieldSchema
  }

  return z.object(shape)
}
