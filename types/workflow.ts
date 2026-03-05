export type WorkflowTrigger =
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'contact_created'
  | 'lead_created'
  | 'lead_converted'
  | 'activity_completed'
  | 'form_submitted'

export type WorkflowConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_set'
  | 'is_not_set'

export interface IWorkflowCondition {
  field: string
  operator: WorkflowConditionOperator
  value?: string | number | boolean
}

export type WorkflowActionType =
  | 'create_activity'
  | 'send_email'
  | 'update_field'
  | 'assign_owner'
  | 'add_tag'
  | 'send_webhook'

export interface IWorkflowAction {
  type: WorkflowActionType
  config: Record<string, unknown>
}

export interface IWorkflow {
  id: string
  organizationId: string
  name: string
  description?: string
  trigger: WorkflowTrigger
  conditions: IWorkflowCondition[]
  actions: IWorkflowAction[]
  active: boolean
  executionCount: number
  lastExecutedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface IWorkflowExecution {
  id: string
  workflowId: string
  organizationId: string
  trigger: WorkflowTrigger
  entityType: string
  entityId: string
  status: 'success' | 'partial_failure' | 'failure'
  results: { action: string; success: boolean; error?: string }[]
  executedAt: string
}
