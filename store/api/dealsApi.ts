import { baseApi } from './baseApi'
import type { IDeal } from '@/types/deal'

export interface GetDealsParams {
  pipelineId?: string
  status?: string
  stage?: string
  ownerId?: string
  contactId?: string
  search?: string
  page?: number
  limit?: number
}

export interface DealsListResponse {
  items: IDeal[]
  total: number
  page: number
  limit: number
}

export interface CreateDealInput {
  title: string
  /** Integer cents */
  value: number
  currency: string
  stage: string
  pipelineId: string
  contactId?: string
  probability?: number
  expectedCloseDate?: string
  notes?: string
}

export interface UpdateDealInput {
  title?: string
  value?: number
  currency?: string
  stage?: string
  pipelineId?: string
  contactId?: string
  status?: 'open' | 'won' | 'lost'
  probability?: number
  expectedCloseDate?: string
  notes?: string
  lostReason?: string
}

export interface MoveDealStageInput {
  stage: string
  probability?: number
}

export const dealsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDeals: builder.query<DealsListResponse, GetDealsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams()
        if (params?.pipelineId) searchParams.set('pipelineId', params.pipelineId)
        if (params?.status) searchParams.set('status', params.status)
        if (params?.stage) searchParams.set('stage', params.stage)
        if (params?.ownerId) searchParams.set('ownerId', params.ownerId)
        if (params?.contactId) searchParams.set('contactId', params.contactId)
        if (params?.search) searchParams.set('search', params.search)
        if (params?.page) searchParams.set('page', String(params.page))
        if (params?.limit) searchParams.set('limit', String(params.limit))
        const qs = searchParams.toString()
        return `/deals${qs ? `?${qs}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Deal' as const, id })),
              { type: 'Deal', id: 'LIST' },
            ]
          : [{ type: 'Deal', id: 'LIST' }],
    }),

    getDeal: builder.query<IDeal, string>({
      query: (id) => `/deals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Deal', id }],
    }),

    createDeal: builder.mutation<IDeal, CreateDealInput>({
      query: (body) => ({
        url: '/deals',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Deal', id: 'LIST' }],
    }),

    updateDeal: builder.mutation<IDeal, { id: string; data: UpdateDealInput }>({
      query: ({ id, data }) => ({
        url: `/deals/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deal', id: 'LIST' },
        { type: 'Deal', id },
      ],
    }),

    deleteDeal: builder.mutation<{ success: true }, string>({
      query: (id) => ({
        url: `/deals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Deal', id: 'LIST' }],
    }),

    moveDealStage: builder.mutation<IDeal, { id: string; data: MoveDealStageInput }>({
      query: ({ id, data }) => ({
        url: `/deals/${id}/stage`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deal', id: 'LIST' },
        { type: 'Deal', id },
      ],
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        // Find all getDeals cache entries and patch them optimistically
        const state = getState()
        const patches: Array<{ undo: () => void }> = []

        // Iterate over all getDeals cache entries
        for (const { endpointName, originalArgs } of dealsApi.util.selectInvalidatedBy(state, [
          { type: 'Deal', id: 'LIST' },
        ])) {
          if (endpointName !== 'getDeals') continue
          const patch = dispatch(
            dealsApi.util.updateQueryData('getDeals', originalArgs as GetDealsParams | void, (draft) => {
              const deal = draft.items.find((d) => d.id === id)
              if (deal) {
                deal.stage = data.stage
                if (data.probability !== undefined) {
                  deal.probability = data.probability
                }
              }
            })
          )
          patches.push(patch)
        }

        try {
          await queryFulfilled
        } catch {
          // Revert all optimistic patches on failure
          for (const patch of patches) {
            patch.undo()
          }
        }
      },
    }),

    checkRotting: builder.mutation<{ checked: number; markedRotten: number; markedFresh: number }, void>({
      query: () => ({ url: '/deals/check-rotting', method: 'POST' }),
      invalidatesTags: [{ type: 'Deal', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetDealsQuery,
  useGetDealQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useMoveDealStageMutation,
  useCheckRottingMutation,
} = dealsApi
