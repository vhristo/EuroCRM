import type { IWorkflowAction, WorkflowTrigger } from '@/types/workflow'
import { replaceTemplateVars } from './templateReplacer'

export interface ActionContext {
  organizationId: string
  trigger: WorkflowTrigger
}

export interface ActionResult {
  success: boolean
  error?: string
}

export async function executeAction(
  action: IWorkflowAction,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'create_activity':
        return await executeCreateActivity(action.config, entity, context)

      case 'send_email':
        return await executeSendEmail(action.config, entity)

      case 'update_field':
        return await executeUpdateField(action.config, entity, context)

      case 'assign_owner':
        return await executeAssignOwner(action.config, entity, context)

      case 'add_tag':
        return await executeAddTag(action.config, entity, context)

      case 'send_webhook':
        return await executeSendWebhook(action.config, entity, context)

      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

async function executeCreateActivity(
  config: Record<string, unknown>,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  // Lazy import to avoid circular deps in non-server environments
  const { connectDB } = await import('@/lib/db')
  const { default: Activity } = await import('@/models/Activity')
  const { default: mongoose } = await import('mongoose')

  await connectDB()

  const activityType = config.type as string | undefined
  const subject = config.subject as string | undefined
  const description = config.description as string | undefined
  const ownerId = config.ownerId as string | undefined

  if (!activityType || !subject) {
    return { success: false, error: 'create_activity requires config.type and config.subject' }
  }

  const validTypes = ['call', 'email', 'meeting', 'task', 'note']
  if (!validTypes.includes(activityType)) {
    return { success: false, error: `Invalid activity type: ${activityType}` }
  }

  // Determine entity links based on what fields the entity has
  const dealId = entity.id && entity.stage ? String(entity.id) : undefined
  const contactId = entity.id && entity.firstName ? String(entity.id) : undefined

  const resolvedOwnerId = ownerId ?? (entity.ownerId ? String(entity.ownerId) : undefined)
  if (!resolvedOwnerId) {
    return { success: false, error: 'create_activity: could not resolve ownerId' }
  }

  await Activity.create({
    organizationId: new mongoose.Types.ObjectId(context.organizationId),
    type: activityType,
    subject: replaceTemplateVars(subject, entity),
    description: description ? replaceTemplateVars(description, entity) : undefined,
    done: false,
    dealId: dealId ? new mongoose.Types.ObjectId(dealId) : undefined,
    contactId: contactId ? new mongoose.Types.ObjectId(contactId) : undefined,
    ownerId: new mongoose.Types.ObjectId(resolvedOwnerId),
  })

  return { success: true }
}

async function executeSendEmail(
  config: Record<string, unknown>,
  entity: Record<string, unknown>
): Promise<ActionResult> {
  // Email sending is a Phase 2 feature.
  // When lib/email exists, import and use it here.
  // For now we log and return success so workflows don't hard-fail.
  const to = config.to as string | undefined
  const subject = config.subject as string | undefined

  if (!to || !subject) {
    return { success: false, error: 'send_email requires config.to and config.subject' }
  }

  const resolvedTo = replaceTemplateVars(to, entity)
  const resolvedSubject = replaceTemplateVars(subject, entity)

  console.log('[Workflow:send_email] Would send email to:', resolvedTo, '| subject:', resolvedSubject)
  return { success: true }
}

async function executeUpdateField(
  config: Record<string, unknown>,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  const { connectDB } = await import('@/lib/db')
  const { default: mongoose } = await import('mongoose')

  await connectDB()

  const field = config.field as string | undefined
  const value = config.value

  if (!field) {
    return { success: false, error: 'update_field requires config.field' }
  }

  const entityId = entity.id ? String(entity.id) : undefined
  if (!entityId) {
    return { success: false, error: 'update_field: entity has no id' }
  }

  // Determine the model from trigger context
  const ModelMap = await getModelMap()
  const model = resolveModel(ModelMap, entity)

  if (!model) {
    return { success: false, error: 'update_field: could not determine entity model' }
  }

  const resolvedValue =
    typeof value === 'string' ? replaceTemplateVars(value, entity) : value

  await model.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(entityId),
      organizationId: new mongoose.Types.ObjectId(context.organizationId),
    },
    { $set: { [field]: resolvedValue } }
  )

  return { success: true }
}

async function executeAssignOwner(
  config: Record<string, unknown>,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  const { connectDB } = await import('@/lib/db')
  const { default: mongoose } = await import('mongoose')

  await connectDB()

  const ownerId = config.ownerId as string | undefined
  if (!ownerId) {
    return { success: false, error: 'assign_owner requires config.ownerId' }
  }

  const entityId = entity.id ? String(entity.id) : undefined
  if (!entityId) {
    return { success: false, error: 'assign_owner: entity has no id' }
  }

  const ModelMap = await getModelMap()
  const model = resolveModel(ModelMap, entity)

  if (!model) {
    return { success: false, error: 'assign_owner: could not determine entity model' }
  }

  await model.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(entityId),
      organizationId: new mongoose.Types.ObjectId(context.organizationId),
    },
    { $set: { ownerId: new mongoose.Types.ObjectId(ownerId) } }
  )

  return { success: true }
}

async function executeAddTag(
  config: Record<string, unknown>,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  const { connectDB } = await import('@/lib/db')
  const { default: mongoose } = await import('mongoose')

  await connectDB()

  const tag = config.tag as string | undefined
  if (!tag) {
    return { success: false, error: 'add_tag requires config.tag' }
  }

  const entityId = entity.id ? String(entity.id) : undefined
  if (!entityId) {
    return { success: false, error: 'add_tag: entity has no id' }
  }

  const resolvedTag = replaceTemplateVars(tag, entity)

  // Only contacts and leads have a tags field
  const ModelMap = await getModelMap()
  const model = resolveTaggableModel(ModelMap, entity)

  if (!model) {
    return { success: false, error: 'add_tag: entity type does not support tags' }
  }

  await model.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(entityId),
      organizationId: new mongoose.Types.ObjectId(context.organizationId),
    },
    { $addToSet: { tags: resolvedTag } }
  )

  return { success: true }
}

async function executeSendWebhook(
  config: Record<string, unknown>,
  entity: Record<string, unknown>,
  context: ActionContext
): Promise<ActionResult> {
  const url = config.url as string | undefined
  if (!url) {
    return { success: false, error: 'send_webhook requires config.url' }
  }

  const payload = {
    trigger: context.trigger,
    organizationId: context.organizationId,
    entity,
    sentAt: new Date().toISOString(),
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    return {
      success: false,
      error: `Webhook returned status ${response.status}`,
    }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MongooseModel = {
  findOneAndUpdate: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ) => Promise<unknown>
}

async function getModelMap(): Promise<Record<string, MongooseModel>> {
  const [
    { default: Deal },
    { default: Contact },
    { default: Lead },
    { default: Activity },
  ] = await Promise.all([
    import('@/models/Deal'),
    import('@/models/Contact'),
    import('@/models/Lead'),
    import('@/models/Activity'),
  ])

  return { Deal, Contact, Lead, Activity }
}

/**
 * Heuristically identify the entity model by its shape.
 * Deal:    has `stage` and `value`
 * Contact: has `firstName` and `lastName`
 * Lead:    has `name` and `source`
 * Activity: has `done` and `subject`
 */
function resolveModel(
  ModelMap: Record<string, MongooseModel>,
  entity: Record<string, unknown>
): MongooseModel | null {
  if ('stage' in entity && 'value' in entity) return ModelMap.Deal
  if ('firstName' in entity && 'lastName' in entity) return ModelMap.Contact
  if ('source' in entity && 'name' in entity) return ModelMap.Lead
  if ('done' in entity && 'subject' in entity) return ModelMap.Activity
  return null
}

function resolveTaggableModel(
  ModelMap: Record<string, MongooseModel>,
  entity: Record<string, unknown>
): MongooseModel | null {
  if ('firstName' in entity && 'lastName' in entity) return ModelMap.Contact
  if ('source' in entity && 'name' in entity) return ModelMap.Lead
  return null
}
