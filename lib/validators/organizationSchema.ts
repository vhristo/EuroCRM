import { z } from 'zod'

/**
 * Name only, deliberately. `plan` and `settings` must never be settable from a
 * request body — the other create routes are protected by their
 * spread-then-override idiom, but a fresh Organization.create() has no such
 * guard, so this schema is the whole defense against self-upgrading a plan.
 */
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200).trim(),
})

export const SwitchOrganizationSchema = z.object({
  organizationId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization id'),
})

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>
export type SwitchOrganizationInput = z.infer<typeof SwitchOrganizationSchema>
