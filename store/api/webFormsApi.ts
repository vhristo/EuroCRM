import { baseApi } from './baseApi'
import type { IWebForm } from '@/types/webForm'
import type { PaginatedResponse } from '@/types/api'

interface WebFormQueryParams {
  page?: number
  limit?: number
  search?: string
}

interface CreateWebFormInput {
  name: string
  description?: string
  fields: IWebForm['fields']
  styling?: IWebForm['styling']
  successMessage?: string
  active?: boolean
}

interface UpdateWebFormInput extends Partial<CreateWebFormInput> {}

interface EmbedCodeResponse {
  slug: string
  iframeCode: string
  jsSnippetCode: string
  directUrl: string
}

export const webFormsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWebForms: builder.query<PaginatedResponse<IWebForm>, WebFormQueryParams>({
      query: (params) => ({ url: '/web-forms', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'WebForm' as const, id })),
              { type: 'WebForm', id: 'LIST' },
            ]
          : [{ type: 'WebForm', id: 'LIST' }],
    }),

    getWebForm: builder.query<IWebForm, string>({
      query: (id) => `/web-forms/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'WebForm', id }],
    }),

    createWebForm: builder.mutation<IWebForm, CreateWebFormInput>({
      query: (body) => ({ url: '/web-forms', method: 'POST', body }),
      invalidatesTags: [{ type: 'WebForm', id: 'LIST' }],
    }),

    updateWebForm: builder.mutation<IWebForm, { id: string; data: UpdateWebFormInput }>({
      query: ({ id, data }) => ({ url: `/web-forms/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'WebForm', id },
        { type: 'WebForm', id: 'LIST' },
      ],
    }),

    deleteWebForm: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/web-forms/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'WebForm', id },
        { type: 'WebForm', id: 'LIST' },
      ],
    }),

    getEmbedCode: builder.query<EmbedCodeResponse, string>({
      query: (id) => `/web-forms/${id}/embed`,
      providesTags: (_result, _error, id) => [{ type: 'WebForm', id }],
    }),
  }),
})

export const {
  useGetWebFormsQuery,
  useGetWebFormQuery,
  useCreateWebFormMutation,
  useUpdateWebFormMutation,
  useDeleteWebFormMutation,
  useGetEmbedCodeQuery,
} = webFormsApi
