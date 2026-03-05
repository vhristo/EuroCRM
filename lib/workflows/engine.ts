import { connectDB } from '@/lib/db'
import Workflow from '@/models/Workflow'
import WorkflowExecution from '@/models/WorkflowExecution'
import type { IWorkflowCondition, WorkflowTrigger } from '@/types/workflow'
import { executeAction } from './actions'

export interface WorkflowContext {
  previousStage?: string
}

/**
 * Evaluate all active workflows for the given trigger and execute matching ones.
 * Called fire-and-forget from API routes — errors are swallowed after logging.
 */
export async function evaluateWorkflows(
  organizationId: string,
  trigger: WorkflowTrigger,
  entity: Record<string, unknown>,
  context: WorkflowContext = {}
): Promise<void> {
  await connectDB()

  // Load all active workflows matching this org + trigger
  const workflows = await Workflow.find({
    organizationId,
    trigger,
    active: true,
  }).lean()

  if (workflows.length === 0) return

  for (const workflow of workflows) {
    // Evaluate conditions — all must pass (AND logic)
    const conditionsPass = evaluateConditions(
      workflow.conditions as IWorkflowCondition[],
      entity,
      context
    )

    if (!conditionsPass) continue

    // Execute all actions sequentially
    const results: { action: string; success: boolean; error?: string }[] = []

    for (const action of workflow.actions) {
      const actionConfig =
        action.config instanceof Map
          ? Object.fromEntries(action.config)
          : (action.config as Record<string, unknown>)

      const result = await executeAction(
        { type: action.type, config: actionConfig },
        entity,
        { organizationId, trigger }
      )

      results.push({
        action: action.type,
        success: result.success,
        error: result.error,
      })
    }

    // Determine overall status
    const successCount = results.filter((r) => r.success).length
    const status =
      successCount === results.length
        ? 'success'
        : successCount === 0
          ? 'failure'
          : 'partial_failure'

    // Log execution
    const entityId = entity.id ? String(entity.id) : 'unknown'
    const entityType = resolveEntityType(trigger)

    await WorkflowExecution.create({
      workflowId: workflow._id,
      organizationId,
      trigger,
      entityType,
      entityId,
      status,
      results,
      executedAt: new Date(),
    })

    // Update workflow stats
    await Workflow.findByIdAndUpdate(workflow._id, {
      $inc: { executionCount: 1 },
      $set: { lastExecutedAt: new Date() },
    })
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function evaluateConditions(
  conditions: IWorkflowCondition[],
  entity: Record<string, unknown>,
  context: WorkflowContext
): boolean {
  if (conditions.length === 0) return true

  return conditions.every((condition) =>
    evaluateCondition(condition, entity, context)
  )
}

function evaluateCondition(
  condition: IWorkflowCondition,
  entity: Record<string, unknown>,
  context: WorkflowContext
): boolean {
  // Support previousStage via context
  let fieldValue: unknown
  if (condition.field === 'previousStage') {
    fieldValue = context.previousStage
  } else {
    fieldValue = getNestedValue(entity, condition.field)
  }

  const conditionValue = condition.value

  switch (condition.operator) {
    case 'is_set':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''

    case 'is_not_set':
      return fieldValue === null || fieldValue === undefined || fieldValue === ''

    case 'equals':
      // eslint-disable-next-line eqeqeq
      return fieldValue == conditionValue

    case 'not_equals':
      // eslint-disable-next-line eqeqeq
      return fieldValue != conditionValue

    case 'contains':
      if (typeof fieldValue === 'string' && typeof conditionValue === 'string') {
        return fieldValue.toLowerCase().includes(conditionValue.toLowerCase())
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue)
      }
      return false

    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue)

    case 'less_than':
      return Number(fieldValue) < Number(conditionValue)

    default:
      return false
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function resolveEntityType(trigger: WorkflowTrigger): string {
  if (trigger.startsWith('deal_')) return 'deal'
  if (trigger.startsWith('contact_')) return 'contact'
  if (trigger.startsWith('lead_')) return 'lead'
  if (trigger.startsWith('activity_')) return 'activity'
  return 'unknown'
}
