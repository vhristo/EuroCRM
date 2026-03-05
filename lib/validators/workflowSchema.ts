import { z } from 'zod'

const WorkflowConditionOperatorEnum = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_set',
  'is_not_set',
])

const WorkflowTriggerEnum = z.enum([
  'deal_created',
  'deal_stage_changed',
  'deal_won',
  'deal_lost',
  'contact_created',
  'lead_created',
  'lead_converted',
  'activity_completed',
  'form_submitted',
])

const WorkflowActionTypeEnum = z.enum([
  'create_activity',
  'send_email',
  'update_field',
  'assign_owner',
  'add_tag',
  'send_webhook',
])

const WorkflowConditionSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: WorkflowConditionOperatorEnum,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
})

const WorkflowActionSchema = z.object({
  type: WorkflowActionTypeEnum,
  config: z.record(z.unknown()),
})

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  trigger: WorkflowTriggerEnum,
  conditions: z.array(WorkflowConditionSchema).default([]),
  actions: z
    .array(WorkflowActionSchema)
    .min(1, 'At least one action is required'),
  active: z.boolean().default(true),
})

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial()

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>
