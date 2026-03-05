export interface IDeal {
  id: string
  organizationId: string
  title: string
  value: number
  currency: string
  stage: string
  pipelineId: string
  contactId?: string
  status: 'open' | 'won' | 'lost'
  probability: number
  expectedCloseDate?: string
  rottenSince?: string | null
  stageEnteredAt: string
  wonAt?: string
  lostAt?: string
  lostReason?: string
  notes?: string
  ownerId: string
  customFields?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
