import { baseApi } from './baseApi'
import type { IAuthResponse, IOrganizationSummary } from '@/types/auth'

export interface CreateOrganizationInput {
  name: string
}

export interface SwitchOrganizationInput {
  organizationId: string
}

export const organizationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query<
      { items: IOrganizationSummary[]; total: number },
      void
    >({
      query: () => '/organizations',
      providesTags: [{ type: 'Organization' as const, id: 'LIST' }],
    }),

    createOrganization: builder.mutation<IAuthResponse, CreateOrganizationInput>({
      query: (body) => ({ url: '/organizations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Organization' as const, id: 'LIST' }],
    }),

    // No invalidatesTags: switching organizations resets the entire cache
    // instead, via useOrganizationSwitch.
    switchOrganization: builder.mutation<IAuthResponse, SwitchOrganizationInput>({
      query: (body) => ({ url: '/auth/switch-org', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
  useSwitchOrganizationMutation,
} = organizationsApi
