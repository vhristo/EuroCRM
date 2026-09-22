'use client'

import { useAppSelector } from '@/store/hooks'

export function useAuth() {
  const { user, accessToken, isAuthenticated, organizations, isBootstrapping } =
    useAppSelector((state) => state.auth)

  // Derived, never stored: a second copy of the active organization could drift
  // from the one the access token actually carries.
  const activeOrganization =
    organizations.find((o) => o.id === user?.organizationId) ?? null

  return {
    user,
    accessToken,
    isAuthenticated,
    organizations,
    activeOrganization,
    isBootstrapping,
  }
}
