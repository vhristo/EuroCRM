'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch } from '@/store/hooks'
import { baseApi } from '@/store/api/baseApi'
import { setSession } from '@/store/slices/authSlice'
import { addNotification } from '@/store/slices/uiSlice'
import type { IAuthResponse } from '@/types/auth'

/**
 * The single place a switched session is applied.
 *
 * Every path that changes the active organization goes through here so the cache
 * reset can never be forgotten: RTK Query cache keys are endpoint plus arguments
 * with no identity component, so without the reset the new organization would be
 * served the previous one's rows until each query refetched.
 */
export function useOrganizationSwitch() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const applySession = useCallback(
    (session: IAuthResponse) => {
      // Order matters: the new token must be in the store before any query is
      // retried, and navigation comes last.
      dispatch(
        setSession({
          user: session.user,
          accessToken: session.accessToken,
          organizations: session.organizations ?? [],
        })
      )
      dispatch(baseApi.util.resetApiState())

      const name =
        session.organizations?.find((o) => o.id === session.user.organizationId)?.name ??
        'company'
      dispatch(addNotification({ type: 'success', message: `Switched to ${name}` }))

      // A detail page's id belongs to the organization we just left.
      router.push('/dashboard')
    },
    [dispatch, router]
  )

  return { applySession }
}
