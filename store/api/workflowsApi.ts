import { baseApi } from './baseApi'
import type { IWorkflow, IWorkflowExecution } from '@/types/workflow'
import type { CreateWorkflowInput, UpdateWorkflowInput } from '@/lib/validators/workflowSchema'

interface WorkflowListResponse {
  items: IWorkflow[]
  total: number
  page: number
  limit: number
}

interface WorkflowExecutionListResponse {
  items: IWorkflowExecution[]
  total: number
  page: number
  limit: number
}

interface WorkflowListParams {
  page?: number
  limit?: number
  trigger?: string
  active?: boolean
}

interface ExecutionListParams {
  id: string
  page?: number
  limit?: number
}

export const workflowsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<WorkflowListResponse, WorkflowListParams>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        if (params.page) searchParams.set('page', String(params.page))
        if (params.limit) searchParams.set('limit', String(params.limit))
        if (params.trigger) searchParams.set('trigger', params.trigger)
        if (params.active !== undefined) searchParams.set('active', String(params.active))
        const qs = searchParams.toString()
        return `/workflows${qs ? `?${qs}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Workflow' as const, id })),
              { type: 'Workflow', id: 'LIST' },
            ]
          : [{ type: 'Workflow', id: 'LIST' }],
    }),

    getWorkflow: builder.query<IWorkflow, string>({
      query: (id) => `/workflows/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Workflow', id }],
    }),

    createWorkflow: builder.mutation<IWorkflow, CreateWorkflowInput>({
      query: (body) => ({
        url: '/workflows',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Workflow', id: 'LIST' }],
    }),

    updateWorkflow: builder.mutation<IWorkflow, { id: string; data: UpdateWorkflowInput }>({
      query: ({ id, data }) => ({
        url: `/workflows/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Workflow', id },
        { type: 'Workflow', id: 'LIST' },
      ],
    }),

    deleteWorkflow: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/workflows/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Workflow', id },
        { type: 'Workflow', id: 'LIST' },
      ],
    }),

    toggleWorkflow: builder.mutation<{ id: string; active: boolean }, string>({
      query: (id) => ({
        url: `/workflows/${id}/toggle`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Workflow', id },
        { type: 'Workflow', id: 'LIST' },
      ],
    }),

    getWorkflowExecutions: builder.query<WorkflowExecutionListResponse, ExecutionListParams>({
      query: ({ id, page, limit }) => {
        const searchParams = new URLSearchParams()
        if (page) searchParams.set('page', String(page))
        if (limit) searchParams.set('limit', String(limit))
        const qs = searchParams.toString()
        return `/workflows/${id}/executions${qs ? `?${qs}` : ''}`
      },
      providesTags: (_result, _error, { id }) => [{ type: 'Workflow', id: `executions-${id}` }],
    }),
  }),
})

export const {
  useGetWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  useToggleWorkflowMutation,
  useGetWorkflowExecutionsQuery,
} = workflowsApi
