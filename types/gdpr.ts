export interface IDataRequest {
  id: string
  organizationId: string
  type: 'export' | 'erasure'
  contactId: string
  contactEmail: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: {
    downloadUrl?: string
    exportData?: Record<string, unknown>
    anonymizedFields?: string[]
  }
  requestedBy: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
