'use client'

import { useAppSelector } from '@/store/hooks'

export function useAuth() {
  const { user, accessToken, isAuthenticated } = useAppSelector(
    (state) => state.auth
  )

  return { user, accessToken, isAuthenticated }
}
