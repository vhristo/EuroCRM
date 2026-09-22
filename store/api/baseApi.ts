import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { AppDispatch, RootState } from '@/store'
import type { IAuthResponse } from '@/types/auth'
import { clearCredentials, setSession } from '@/store/slices/authSlice'
import { addNotification } from '@/store/slices/uiSlice'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

let refreshPromise: Promise<boolean> | null = null

/**
 * Exchanges the refresh cookie for a new session.
 *
 * Shared by the 401 interceptor and the dashboard's mount-time bootstrap: token
 * rotation is single-use, so two concurrent refreshes would leave the loser with
 * a 401 and sign the user out for no reason.
 *
 * `previousOrganizationId` lets this detect that the active organization changed
 * underneath us — the server falls back to another organization when a membership
 * has been revoked, and a tab that switched elsewhere sees it here too. The cached
 * data belongs to the old organization, so it has to go.
 */
export function refreshSession(
  dispatch: AppDispatch,
  previousOrganizationId?: string | null
): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' })
        if (!res.ok) {
          dispatch(clearCredentials())
          return false
        }

        const data = (await res.json()) as IAuthResponse
        dispatch(
          setSession({
            user: data.user,
            accessToken: data.accessToken,
            organizations: data.organizations ?? [],
          })
        )

        if (previousOrganizationId && previousOrganizationId !== data.user.organizationId) {
          dispatch(baseApi.util.resetApiState())
          const name =
            data.organizations?.find((o) => o.id === data.user.organizationId)?.name ??
            'another company'
          dispatch(addNotification({ type: 'info', message: `Switched to ${name}` }))
        }

        return true
      } catch {
        dispatch(clearCredentials())
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    const previousOrganizationId =
      (api.getState() as RootState).auth.user?.organizationId ?? null

    await refreshSession(api.dispatch as AppDispatch, previousOrganizationId)

    const state = api.getState() as RootState
    if (state.auth.accessToken) {
      result = await baseQuery(args, api, extraOptions)
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Contact', 'Deal', 'Lead', 'Activity', 'Pipeline', 'Report', 'CustomField', 'WebForm', 'Email', 'EmailConfig', 'Campaign', 'DataRequest', 'Workflow', 'ApiKey', 'Webhook', 'Organization'],
  endpoints: () => ({}),
})
