import { baseApi } from './baseApi'
import type { ICampaign, ICampaignRecipient } from '@/types/campaign'
import type { PaginatedResponse } from '@/types/api'

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  recipientFilter?: {
    tags?: string[]
    ownerId?: string
    country?: string
  }
  scheduledAt?: string
}

export interface UpdateCampaignInput {
  name?: string
  subject?: string
  htmlBody?: string
  textBody?: string
  recipientFilter?: {
    tags?: string[]
    ownerId?: string
    country?: string
  }
  scheduledAt?: string
}

export interface GetCampaignsParams {
  page?: number
  limit?: number
  status?: string
}

export interface GetRecipientsParams {
  page?: number
  limit?: number
  status?: string
}

export interface PreviewResponse {
  subject: string
  htmlBody: string
  textBody?: string
  sampleContact: {
    firstName?: string
    lastName?: string
    email?: string
    company?: string
  }
}

export interface SendResult {
  success: true
  sent: number
  failed: number
}

export interface TestResult {
  success: true
  sentTo: string
}

// ---------------------------------------------------------------------------
// API slice
// ---------------------------------------------------------------------------

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List campaigns
    getCampaigns: builder.query<PaginatedResponse<ICampaign>, GetCampaignsParams | void>({
      query: (params) => ({ url: '/campaigns', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Campaign' as const, id })),
              { type: 'Campaign' as const, id: 'LIST' },
            ]
          : [{ type: 'Campaign' as const, id: 'LIST' }],
    }),

    // Get single campaign
    getCampaign: builder.query<ICampaign, string>({
      query: (id) => `/campaigns/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Campaign' as const, id }],
    }),

    // Create campaign
    createCampaign: builder.mutation<ICampaign, CreateCampaignInput>({
      query: (body) => ({ url: '/campaigns', method: 'POST', body }),
      invalidatesTags: [{ type: 'Campaign' as const, id: 'LIST' }],
    }),

    // Update campaign
    updateCampaign: builder.mutation<ICampaign, { id: string; data: UpdateCampaignInput }>({
      query: ({ id, data }) => ({ url: `/campaigns/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Campaign' as const, id },
        { type: 'Campaign' as const, id: 'LIST' },
      ],
    }),

    // Delete campaign
    deleteCampaign: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Campaign' as const, id },
        { type: 'Campaign' as const, id: 'LIST' },
      ],
    }),

    // Start sending
    sendCampaign: builder.mutation<SendResult, string>({
      query: (id) => ({ url: `/campaigns/${id}/send`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Campaign' as const, id },
        { type: 'Campaign' as const, id: 'LIST' },
      ],
    }),

    // Pause campaign
    pauseCampaign: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/campaigns/${id}/pause`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Campaign' as const, id },
        { type: 'Campaign' as const, id: 'LIST' },
      ],
    }),

    // Get recipients
    getCampaignRecipients: builder.query<
      PaginatedResponse<ICampaignRecipient>,
      { id: string } & GetRecipientsParams
    >({
      query: ({ id, ...params }) => ({ url: `/campaigns/${id}/recipients`, params }),
      providesTags: (_result, _error, { id }) => [{ type: 'Campaign' as const, id: `recipients-${id}` }],
    }),

    // Preview with merge tags
    previewCampaign: builder.mutation<PreviewResponse, string>({
      query: (id) => ({ url: `/campaigns/${id}/preview`, method: 'POST' }),
    }),

    // Send test email to current user
    testCampaign: builder.mutation<TestResult, string>({
      query: (id) => ({ url: `/campaigns/${id}/test`, method: 'POST' }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useSendCampaignMutation,
  usePauseCampaignMutation,
  useGetCampaignRecipientsQuery,
  usePreviewCampaignMutation,
  useTestCampaignMutation,
} = campaignsApi
