import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store'
import { clearCredentials, updateAccessToken } from '@/store/slices/authSlice'

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

let refreshPromise: Promise<unknown> | null = null

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshResult = await baseQuery(
            { url: '/auth/refresh', method: 'POST' },
            api,
            extraOptions
          )

          if (refreshResult.data) {
            const data = refreshResult.data as { accessToken: string }
            api.dispatch(updateAccessToken(data.accessToken))
          } else {
            api.dispatch(clearCredentials())
          }
        } finally {
          refreshPromise = null
        }
      })()
    }

    await refreshPromise

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
  tagTypes: ['Contact', 'Deal', 'Lead', 'Activity', 'Pipeline', 'Report', 'CustomField', 'WebForm', 'Email', 'EmailConfig', 'Campaign', 'DataRequest', 'Workflow', 'ApiKey', 'Webhook'],
  endpoints: () => ({}),
})
