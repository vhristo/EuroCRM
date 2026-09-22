'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { IOrganizationSummary } from '@/types/auth'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** Role in the currently active organization. */
  role: string
  /** The currently active organization. Mirrors the access token's claim. */
  organizationId: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  organizations: IOrganizationSummary[]
  /** True until the first session-restore attempt settles on mount. */
  isBootstrapping: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  organizations: [],
  isBootstrapping: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** The whole session in one action — used by login, register, refresh and switch. */
    setSession(
      state,
      action: PayloadAction<{
        user: AuthUser
        accessToken: string
        organizations: IOrganizationSummary[]
      }>
    ) {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.organizations = action.payload.organizations
      state.isAuthenticated = true
      state.isBootstrapping = false
    },
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string }>
    ) {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true
      state.isBootstrapping = false
    },
    updateAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    clearCredentials(state) {
      state.user = null
      state.accessToken = null
      state.organizations = []
      state.isAuthenticated = false
      state.isBootstrapping = false
    },
    /** Marks the mount-time session restore as finished without a session. */
    bootstrapFinished(state) {
      state.isBootstrapping = false
    },
  },
})

export const {
  setSession,
  setCredentials,
  updateAccessToken,
  clearCredentials,
  bootstrapFinished,
} = authSlice.actions
export default authSlice.reducer
