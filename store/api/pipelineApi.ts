import { baseApi } from './baseApi'
import type { IPipeline } from '@/types/pipeline'

export interface CreatePipelineInput {
  name: string
}

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

    createPipeline: builder.mutation<IPipeline, CreatePipelineInput>({
      query: (body) => ({
        url: '/pipeline',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Pipeline', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const { useGetPipelinesQuery, useCreatePipelineMutation } = pipelineApi
