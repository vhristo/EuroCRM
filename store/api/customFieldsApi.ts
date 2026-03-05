import { baseApi } from './baseApi'
import type { ICustomFieldDefinition, CustomFieldEntityType } from '@/types/customField'
import type { CreateCustomFieldInput, UpdateCustomFieldInput, ReorderCustomFieldsInput } from '@/lib/validators/customFieldSchema'

export const customFieldsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomFields: builder.query<ICustomFieldDefinition[], CustomFieldEntityType>({
      query: (entityType) => `/settings/custom-fields?entityType=${entityType}`,
      providesTags: (_result, _error, entityType) => [
        { type: 'CustomField', id: entityType },
      ],
    }),

    createCustomField: builder.mutation<ICustomFieldDefinition, CreateCustomFieldInput>({
      query: (data) => ({
        url: '/settings/custom-fields',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CustomField', id: arg.entityType },
      ],
    }),

    updateCustomField: builder.mutation<
      ICustomFieldDefinition,
      { id: string; entityType: CustomFieldEntityType; data: UpdateCustomFieldInput }
    >({
      query: ({ id, data }) => ({
        url: `/settings/custom-fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CustomField', id: arg.entityType },
      ],
    }),

    deleteCustomField: builder.mutation<
      { success: true },
      { id: string; entityType: CustomFieldEntityType }
    >({
      query: ({ id }) => ({
        url: `/settings/custom-fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CustomField', id: arg.entityType },
      ],
    }),

    reorderCustomFields: builder.mutation<
      ICustomFieldDefinition[],
      { entityType: CustomFieldEntityType; data: ReorderCustomFieldsInput }
    >({
      query: ({ entityType, data }) => ({
        url: '/settings/custom-fields/reorder',
        method: 'PUT',
        body: { entityType, ...data },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CustomField', id: arg.entityType },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useReorderCustomFieldsMutation,
} = customFieldsApi
