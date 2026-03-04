import { baseApi } from './baseApi'

interface OrganizationSettings {
  id: string
  name: string
  plan: string
  settings: {
    defaultCurrency: string
    timezone: string
  }
}

interface UpdateOrgInput {
  name?: string
  settings?: {
    defaultCurrency?: string
    timezone?: string
  }
}

interface UpdateProfileInput {
  firstName?: string
  lastName?: string
}

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganization: builder.query<OrganizationSettings, void>({
      query: () => '/settings/organization',
    }),
    updateOrganization: builder.mutation<OrganizationSettings, UpdateOrgInput>({
      query: (body) => ({ url: '/settings/organization', method: 'PUT', body }),
    }),
    updateProfile: builder.mutation<UserProfile, UpdateProfileInput>({
      query: (body) => ({ url: '/settings/profile', method: 'PUT', body }),
    }),
    changePassword: builder.mutation<{ success: true }, ChangePasswordInput>({
      query: (body) => ({ url: '/settings/profile', method: 'PUT', body }),
    }),
  }),
})

export const {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = settingsApi
