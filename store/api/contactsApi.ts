import { baseApi } from './baseApi'
import type { IContact } from '@/types/contact'
import type { PaginatedResponse } from '@/types/api'

export interface CreateContactInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  country?: string
  city?: string
  address?: string
  currency?: string
  tags?: string[]
  notes?: string
}

export interface UpdateContactInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  country?: string
  city?: string
  address?: string
  currency?: string
  tags?: string[]
  notes?: string
}

export interface GetContactsParams {
  page?: number
  limit?: number
  search?: string
  ownerId?: string
}

export const contactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<PaginatedResponse<IContact>, GetContactsParams | void>({
      query: (params) => ({ url: '/contacts', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Contact' as const, id })),
              { type: 'Contact' as const, id: 'LIST' },
            ]
          : [{ type: 'Contact' as const, id: 'LIST' }],
    }),

    getContact: builder.query<IContact, string>({
      query: (id) => `/contacts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Contact' as const, id }],
    }),

    createContact: builder.mutation<IContact, CreateContactInput>({
      query: (body) => ({ url: '/contacts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Contact' as const, id: 'LIST' }],
    }),

    updateContact: builder.mutation<IContact, { id: string; data: UpdateContactInput }>({
      query: ({ id, data }) => ({ url: `/contacts/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Contact' as const, id },
        { type: 'Contact' as const, id: 'LIST' },
      ],
    }),

    deleteContact: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/contacts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Contact' as const, id },
        { type: 'Contact' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetContactsQuery,
  useGetContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi
