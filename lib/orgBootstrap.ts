import Pipeline from '@/models/Pipeline'
import { DEFAULT_PIPELINE_STAGES } from '@/utils/constants'

/**
 * Gives a freshly created organization the starting data it needs.
 *
 * Idempotent: safe to call on an organization that already has pipelines.
 * Called at registration and when a user creates an additional organization,
 * so a new organization is never left without a pipeline for deals to land in.
 */
export async function seedOrganization(organizationId: string): Promise<void> {
  const existing = await Pipeline.countDocuments({ organizationId })
  if (existing > 0) return

  const stages = DEFAULT_PIPELINE_STAGES.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    order: s.order,
    probability: s.probability,
    rotDays: s.rotDays,
  }))

  await Pipeline.create({
    organizationId,
    name: 'Sales Pipeline',
    stages,
    isDefault: true,
  })
}
