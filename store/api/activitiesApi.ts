import { baseApi } from './baseApi'
import type { PaginatedResponse } from '@/types/api'

interface IActivity {
  id: string
  organizationId: string
  type: string
  subject: string
  description?: string
  dueDate?: string
  done: boolean
  doneAt?: string
  contactId?: string
  dealId?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface ActivityQueryParams {
  page?: number
  limit?: number
  type?: string
  done?: string
  contactId?: string
  dealId?: string
  ownerId?: string
}

interface CreateActivityInput {
  type: string
  subject: string
  description?: string
  dueDate?: string
  contactId?: string
  dealId?: string
}

export const activitiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivities: builder.query<PaginatedResponse<IActivity>, ActivityQueryParams>({
      query: (params) => ({ url: '/activities', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Activity' as const, id })),
              { type: 'Activity', id: 'LIST' },
            ]
          : [{ type: 'Activity', id: 'LIST' }],
    }),
    getActivity: builder.query<IActivity, string>({
      query: (id) => `/activities/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Activity', id }],
    }),
    createActivity: builder.mutation<IActivity, CreateActivityInput>({
      query: (body) => ({ url: '/activities', method: 'POST', body }),
      invalidatesTags: [{ type: 'Activity', id: 'LIST' }],
    }),
    updateActivity: builder.mutation<IActivity, { id: string; data: Partial<CreateActivityInput> }>({
      query: ({ id, data }) => ({ url: `/activities/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Activity', id },
        { type: 'Activity', id: 'LIST' },
      ],
    }),
    deleteActivity: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/activities/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Activity', id },
        { type: 'Activity', id: 'LIST' },
      ],
    }),
    toggleActivityDone: builder.mutation<IActivity, string>({
      query: (id) => ({ url: `/activities/${id}/done`, method: 'PUT' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Activity', id },
        { type: 'Activity', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetActivitiesQuery,
  useGetActivityQuery,
  useCreateActivityMutation,
  useUpdateActivityMutation,
  useDeleteActivityMutation,
  useToggleActivityDoneMutation,
} = activitiesApi
