import { baseApi } from './baseApi'
import type { PaginatedResponse } from '@/types/api'

interface ILead {
  id: string
  organizationId: string
  name: string
  email?: string
  phone?: string
  company?: string
  source: string
  status: string
  notes?: string
  ownerId: string
  convertedToDealId?: string | null
  convertedToContactId?: string | null
  convertedAt?: string
  createdAt: string
  updatedAt: string
}

interface LeadQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  ownerId?: string
}

interface CreateLeadInput {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: string
  notes?: string
}

interface ConvertLeadInput {
  dealTitle: string
  dealValue: number
  currency?: string
  pipelineId: string
  stage: string
}

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeads: builder.query<PaginatedResponse<ILead>, LeadQueryParams>({
      query: (params) => ({ url: '/leads', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'LIST' },
            ]
          : [{ type: 'Lead', id: 'LIST' }],
    }),
    getLead: builder.query<ILead, string>({
      query: (id) => `/leads/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Lead', id }],
    }),
    createLead: builder.mutation<ILead, CreateLeadInput>({
      query: (body) => ({ url: '/leads', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }],
    }),
    updateLead: builder.mutation<ILead, { id: string; data: Partial<CreateLeadInput> & { status?: string } }>({
      query: ({ id, data }) => ({ url: `/leads/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
      ],
    }),
    deleteLead: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/leads/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
      ],
    }),
    convertLead: builder.mutation<unknown, { id: string; data: ConvertLeadInput }>({
      query: ({ id, data }) => ({ url: `/leads/${id}/convert`, method: 'POST', body: data }),
      invalidatesTags: [
        { type: 'Lead', id: 'LIST' },
        { type: 'Contact', id: 'LIST' },
        { type: 'Deal', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetLeadsQuery,
  useGetLeadQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useConvertLeadMutation,
} = leadsApi
