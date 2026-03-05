import { baseApi } from './baseApi'
import type { IWebhook, IWebhookDelivery } from '@/types/webhook'
import type { PaginatedResponse } from '@/types/api'

export interface CreateWebhookInput {
  url: string
  events: string[]
  active?: boolean
}

export interface UpdateWebhookInput {
  url?: string
  events?: string[]
  active?: boolean
}

export interface CreateWebhookResponse extends IWebhook {
  secret: string // Signing secret — only present on creation response
}

export interface TestWebhookResponse {
  success: boolean
  responseStatus: number | null
  responseBody: string | null
  error: string | null
}

export interface GetDeliveriesParams {
  webhookId: string
  page?: number
  limit?: number
}

export const webhooksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWebhooks: builder.query<{ items: IWebhook[]; total: number }, void>({
      query: () => '/settings/webhooks',
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Webhook' as const, id })),
              { type: 'Webhook' as const, id: 'LIST' },
            ]
          : [{ type: 'Webhook' as const, id: 'LIST' }],
    }),

    getWebhook: builder.query<IWebhook, string>({
      query: (id) => `/settings/webhooks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Webhook' as const, id }],
    }),

    createWebhook: builder.mutation<CreateWebhookResponse, CreateWebhookInput>({
      query: (body) => ({ url: '/settings/webhooks', method: 'POST', body }),
      invalidatesTags: [{ type: 'Webhook' as const, id: 'LIST' }],
    }),

    updateWebhook: builder.mutation<IWebhook, { id: string; data: UpdateWebhookInput }>({
      query: ({ id, data }) => ({ url: `/settings/webhooks/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Webhook' as const, id },
        { type: 'Webhook' as const, id: 'LIST' },
      ],
    }),

    deleteWebhook: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/settings/webhooks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Webhook' as const, id },
        { type: 'Webhook' as const, id: 'LIST' },
      ],
    }),

    getWebhookDeliveries: builder.query<PaginatedResponse<IWebhookDelivery>, GetDeliveriesParams>({
      query: ({ webhookId, page = 1, limit = 20 }) => ({
        url: `/settings/webhooks/${webhookId}/deliveries`,
        params: { page, limit },
      }),
      providesTags: (_result, _error, { webhookId }) => [
        { type: 'Webhook' as const, id: `deliveries-${webhookId}` },
      ],
    }),

    testWebhook: builder.mutation<TestWebhookResponse, string>({
      query: (id) => ({ url: `/settings/webhooks/${id}/test`, method: 'POST' }),
      // Invalidate deliveries cache so the test delivery appears in the log
      invalidatesTags: (_result, _error, id) => [
        { type: 'Webhook' as const, id: `deliveries-${id}` },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetWebhooksQuery,
  useGetWebhookQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useGetWebhookDeliveriesQuery,
  useTestWebhookMutation,
} = webhooksApi
