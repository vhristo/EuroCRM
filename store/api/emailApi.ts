import { baseApi } from './baseApi'
import type {
  IEmailMessage,
  IEmailConfig,
  ISendEmailPayload,
  IEmailListResponse,
} from '@/types/email'

interface ListMessagesParams {
  page?: number
  limit?: number
  search?: string
  status?: 'queued' | 'sent' | 'failed' | ''
}

interface SendEmailResponse {
  id: string
  trackingId: string
  status: string
  sentAt?: string
}

interface TestConnectionResponse {
  success: boolean
  message: string
}

export const emailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Send an email
    sendEmail: builder.mutation<SendEmailResponse, ISendEmailPayload>({
      query: (body) => ({
        url: '/email/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Email', id: 'LIST' }],
    }),

    // List sent email messages
    listEmailMessages: builder.query<IEmailListResponse, ListMessagesParams>({
      query: ({ page = 1, limit = 20, search = '', status = '' } = {}) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        return `/email/messages?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((m) => ({ type: 'Email' as const, id: m.id })),
              { type: 'Email' as const, id: 'LIST' },
            ]
          : [{ type: 'Email' as const, id: 'LIST' }],
    }),

    // Get single email message detail
    getEmailMessage: builder.query<IEmailMessage, string>({
      query: (id) => `/email/messages/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Email', id }],
    }),

    // Get email SMTP config (admin only)
    getEmailConfig: builder.query<IEmailConfig | null, void>({
      query: () => '/settings/email-config',
      providesTags: [{ type: 'EmailConfig', id: 'SINGLETON' }],
    }),

    // Save/update email SMTP config (admin only)
    saveEmailConfig: builder.mutation<IEmailConfig, Omit<IEmailConfig, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>({
      query: (body) => ({
        url: '/settings/email-config',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'EmailConfig', id: 'SINGLETON' }],
    }),

    // Test SMTP connection (admin only)
    testEmailConnection: builder.mutation<TestConnectionResponse, void>({
      query: () => ({
        url: '/settings/email-config/test',
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useSendEmailMutation,
  useListEmailMessagesQuery,
  useGetEmailMessageQuery,
  useGetEmailConfigQuery,
  useSaveEmailConfigMutation,
  useTestEmailConnectionMutation,
} = emailApi
