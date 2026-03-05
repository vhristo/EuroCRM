export interface IContact {
  id: string
  organizationId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  country?: string
  city?: string
  address?: string
  currency: string
  tags: string[]
  notes?: string
  ownerId: string
  customFields?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
