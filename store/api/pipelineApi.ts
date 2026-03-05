import { baseApi } from './baseApi'
import type { IPipeline } from '@/types/pipeline'
import type { CreatePipelineInput, UpdatePipelineInput } from '@/lib/validators/pipelineSchema'

export const pipelineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPipelines: builder.query<IPipeline[], void>({
      query: () => '/pipeline',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Pipeline' as const, id })),
              { type: 'Pipeline', id: 'LIST' },
            ]
          : [{ type: 'Pipeline', id: 'LIST' }],
    }),

    getPipeline: builder.query<IPipeline, string>({
      query: (id) => `/pipeline/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Pipeline', id }],
    }),

    createPipeline: builder.mutation<IPipeline, CreatePipelineInput>({
      query: (body) => ({
        url: '/pipeline',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Pipeline', id: 'LIST' }],
    }),

    updatePipeline: builder.mutation<IPipeline, { id: string; data: UpdatePipelineInput }>({
      query: ({ id, data }) => ({
        url: `/pipeline/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Pipeline', id },
        { type: 'Pipeline', id: 'LIST' },
      ],
    }),

    deletePipeline: builder.mutation<{ success: true }, string>({
      query: (id) => ({
        url: `/pipeline/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Pipeline', id: 'LIST' }],
    }),

    setDefaultPipeline: builder.mutation<IPipeline, string>({
      query: (id) => ({
        url: `/pipeline/${id}/default`,
        method: 'PUT',
      }),
      invalidatesTags: [{ type: 'Pipeline', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetPipelinesQuery,
  useGetPipelineQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
  useSetDefaultPipelineMutation,
} = pipelineApi
