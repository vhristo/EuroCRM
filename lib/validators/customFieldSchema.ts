import { z } from 'zod'
import type { ICustomFieldDefinition } from '@/types/customField'

const CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
  'multiselect',
  'checkbox',
  'url',
  'email',
  'phone',
] as const

const ENTITY_TYPES = ['contacts', 'deals', 'leads'] as const

// ─── Base object (no refine) so we can derive partial from it ────────────────

const CreateCustomFieldBase = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(64, 'Name must be 64 characters or fewer')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores'
    ),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(128, 'Label must be 128 characters or fewer'),
  type: z.enum(CUSTOM_FIELD_TYPES, { required_error: 'Type is required' }),
  entityType: z.enum(ENTITY_TYPES, { required_error: 'Entity type is required' }),
  required: z.boolean().default(false),
  options: z
    .array(z.string().min(1).max(256))
    .optional(),
})

// ─── Create schema — adds cross-field refine ─────────────────────────────────

export const CreateCustomFieldSchema = CreateCustomFieldBase.refine(
  (data) => {
    if (data.type === 'select' || data.type === 'multiselect') {
      return Array.isArray(data.options) && data.options.length >= 1
    }
    return true
  },
  {
    message: 'Select and multiselect fields must have at least one option',
    path: ['options'],
  }
)

export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldSchema>

// ─── Update schema — partial of the mutable fields only ──────────────────────
// name and entityType are immutable after creation, so they are excluded.

const UpdateCustomFieldBase = CreateCustomFieldBase
  .omit({ name: true, entityType: true })
  .partial()

export const UpdateCustomFieldSchema = UpdateCustomFieldBase.refine(
  (data) => {
    if (data.type === 'select' || data.type === 'multiselect') {
      return Array.isArray(data.options) && data.options.length >= 1
    }
    return true
  },
  {
    message: 'Select and multiselect fields must have at least one option',
    path: ['options'],
  }
)

export type UpdateCustomFieldInput = z.infer<typeof UpdateCustomFieldSchema>

// ─── Reorder schema ───────────────────────────────────────────────────────────

export const ReorderCustomFieldsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
      })
    )
    .min(1, 'At least one item required'),
})

export type ReorderCustomFieldsInput = z.infer<typeof ReorderCustomFieldsSchema>

// ─── Runtime value validator ──────────────────────────────────────────────────

/**
 * Validates a map of custom field values against the field definitions for an entity.
 * Returns a Record<fieldName, errorMessage> — empty object means valid.
 */
export function validateCustomFieldValues(
  definitions: ICustomFieldDefinition[],
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of definitions) {
    const value = values[field.name]
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)

    if (field.required && isEmpty) {
      errors[field.name] = `${field.label} is required`
      continue
    }

    if (isEmpty) continue

    switch (field.type) {
      case 'number': {
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors[field.name] = `${field.label} must be a valid number`
        }
        break
      }
      case 'date': {
        const d = new Date(value as string)
        if (isNaN(d.getTime())) {
          errors[field.name] = `${field.label} must be a valid date`
        }
        break
      }
      case 'email': {
        const emailResult = z.string().email().safeParse(value)
        if (!emailResult.success) {
          errors[field.name] = `${field.label} must be a valid email address`
        }
        break
      }
      case 'url': {
        const urlResult = z.string().url().safeParse(value)
        if (!urlResult.success) {
          errors[field.name] = `${field.label} must be a valid URL`
        }
        break
      }
      case 'select': {
        if (field.options && !field.options.includes(value as string)) {
          errors[field.name] = `${field.label} must be one of the allowed options`
        }
        break
      }
      case 'multiselect': {
        if (!Array.isArray(value)) {
          errors[field.name] = `${field.label} must be an array`
        } else if (field.options) {
          const invalid = (value as string[]).filter(
            (v) => !field.options!.includes(v)
          )
          if (invalid.length > 0) {
            errors[field.name] = `${field.label} contains invalid options: ${invalid.join(', ')}`
          }
        }
        break
      }
      case 'checkbox': {
        if (typeof value !== 'boolean') {
          errors[field.name] = `${field.label} must be a boolean`
        }
        break
      }
      default:
        break
    }
  }

  return errors
}
