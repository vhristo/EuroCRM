import { baseApi } from './baseApi'
import type { IDataRequest } from '@/types/gdpr'
import type { PaginatedResponse } from '@/types/api'

export interface CreateDataRequestInput {
  type: 'export' | 'erasure'
  contactId: string
}

export interface ConfirmErasureInput {
  confirmation: 'DELETE'
}

export interface ConfirmErasureResponse {
  success: true
  anonymizedFields: string[]
  completedAt: string
}

export interface GetDataRequestsParams {
  page?: number
  limit?: number
}

export const gdprApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createDataRequest: builder.mutation<IDataRequest, CreateDataRequestInput>({
      query: (body) => ({
        url: '/gdpr/request',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DataRequest' as const, id: 'LIST' }],
    }),

    listDataRequests: builder.query<
      PaginatedResponse<IDataRequest>,
      GetDataRequestsParams | void
    >({
      query: (params) => ({
        url: '/gdpr/requests',
        params: params ?? {},
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: 'DataRequest' as const,
                id,
              })),
              { type: 'DataRequest' as const, id: 'LIST' },
            ]
          : [{ type: 'DataRequest' as const, id: 'LIST' }],
    }),

    getDataRequest: builder.query<IDataRequest, string>({
      query: (id) => `/gdpr/requests/${id}`,
      providesTags: (_result, _error, id) => [
        { type: 'DataRequest' as const, id },
      ],
    }),

    // Returns a Blob — caller is responsible for creating an object URL
    downloadExport: builder.query<Blob, string>({
      query: (id) => ({
        url: `/gdpr/requests/${id}/download`,
        responseHandler: (response) => response.blob(),
      }),
      providesTags: (_result, _error, id) => [
        { type: 'DataRequest' as const, id },
      ],
    }),

    confirmErasure: builder.mutation<
      ConfirmErasureResponse,
      { id: string; body: ConfirmErasureInput }
    >({
      query: ({ id, body }) => ({
        url: `/gdpr/requests/${id}/confirm`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DataRequest' as const, id },
        { type: 'DataRequest' as const, id: 'LIST' },
        // Invalidate the contact so the UI reflects anonymized data
        { type: 'Contact' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useCreateDataRequestMutation,
  useListDataRequestsQuery,
  useGetDataRequestQuery,
  useLazyDownloadExportQuery,
  useConfirmErasureMutation,
} = gdprApi
