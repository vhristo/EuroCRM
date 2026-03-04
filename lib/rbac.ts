import { NextResponse } from 'next/server'
import type { AuthPayload } from './auth'

type Permission =
  | 'contacts:read'
  | 'contacts:write'
  | 'contacts:delete'
  | 'deals:read'
  | 'deals:write'
  | 'deals:delete'
  | 'leads:read'
  | 'leads:write'
  | 'leads:delete'
  | 'activities:read'
  | 'activities:write'
  | 'activities:delete'
  | 'reports:read'
  | 'pipeline:read'
  | 'pipeline:write'
  | 'settings:read'
  | 'settings:write'
  | 'users:read'
  | 'users:write'

const rolePermissions: Record<string, Permission[]> = {
  admin: [
    'contacts:read', 'contacts:write', 'contacts:delete',
    'deals:read', 'deals:write', 'deals:delete',
    'leads:read', 'leads:write', 'leads:delete',
    'activities:read', 'activities:write', 'activities:delete',
    'reports:read',
    'pipeline:read', 'pipeline:write',
    'settings:read', 'settings:write',
    'users:read', 'users:write',
  ],
  manager: [
    'contacts:read', 'contacts:write', 'contacts:delete',
    'deals:read', 'deals:write', 'deals:delete',
    'leads:read', 'leads:write', 'leads:delete',
    'activities:read', 'activities:write', 'activities:delete',
    'reports:read',
    'pipeline:read', 'pipeline:write',
    'settings:read',
    'users:read',
  ],
  sales_rep: [
    'contacts:read', 'contacts:write',
    'deals:read', 'deals:write',
    'leads:read', 'leads:write',
    'activities:read', 'activities:write',
    'reports:read',
    'pipeline:read',
  ],
}

export function hasPermission(auth: AuthPayload, permission: Permission): boolean {
  const permissions = rolePermissions[auth.role]
  return permissions?.includes(permission) ?? false
}

export function requireRole(auth: AuthPayload, ...roles: string[]): NextResponse | null {
  if (!roles.includes(auth.role)) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
      { status: 403 }
    )
  }
  return null
}

export function isSalesRep(auth: AuthPayload): boolean {
  return auth.role === 'sales_rep'
}

export function applyOwnerFilter(
  filter: Record<string, unknown>,
  auth: AuthPayload
): Record<string, unknown> {
  if (isSalesRep(auth)) {
    filter.ownerId = auth.userId
  }
  return filter
}
