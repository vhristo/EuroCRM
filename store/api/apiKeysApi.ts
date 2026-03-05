import { baseApi } from './baseApi'
import type { IApiKey } from '@/types/apiKey'

export interface CreateApiKeyInput {
  name: string
  permissions: string[]
  expiresAt?: string
}

export interface CreateApiKeyResponse extends IApiKey {
  key: string // Full API key — only present on creation response
}

export const apiKeysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApiKeys: builder.query<{ items: IApiKey[]; total: number }, void>({
      query: () => '/settings/api-keys',
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'ApiKey' as const, id })),
              { type: 'ApiKey' as const, id: 'LIST' },
            ]
          : [{ type: 'ApiKey' as const, id: 'LIST' }],
    }),

    createApiKey: builder.mutation<CreateApiKeyResponse, CreateApiKeyInput>({
      query: (body) => ({ url: '/settings/api-keys', method: 'POST', body }),
      invalidatesTags: [{ type: 'ApiKey' as const, id: 'LIST' }],
    }),

    deleteApiKey: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/settings/api-keys/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ApiKey' as const, id },
        { type: 'ApiKey' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
} = apiKeysApi
