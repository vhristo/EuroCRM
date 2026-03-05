export interface IApiKey {
  id: string
  organizationId: string
  name: string
  keyPrefix: string // first 12 chars for display (e.g., "eurocrm_ab12")
  keyHash: string // SHA-256 hash of the full key
  permissions: string[] // e.g., ['contacts:read', 'deals:read', 'deals:write']
  lastUsedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const API_KEY_PERMISSIONS = [
  'contacts:read',
  'contacts:write',
  'contacts:delete',
  'deals:read',
  'deals:write',
  'deals:delete',
  'leads:read',
  'leads:write',
  'leads:delete',
  'activities:read',
  'activities:write',
  'activities:delete',
  'pipelines:read',
] as const

export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number]
