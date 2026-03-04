'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface UiState {
  sidebarOpen: boolean
  activeModal: string | null
  notifications: Notification[]
}

const initialState: UiState = {
  sidebarOpen: true,
  activeModal: null,
  notifications: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    setActiveModal(state, action: PayloadAction<string | null>) {
      state.activeModal = action.payload
    },
    addNotification(
      state,
      action: PayloadAction<Omit<Notification, 'id'>>
    ) {
      state.notifications.push({
        ...action.payload,
        id: crypto.randomUUID(),
      })
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      )
    },
  },
})

export const {
  toggleSidebar,
  setSidebarOpen,
  setActiveModal,
  addNotification,
  removeNotification,
} = uiSlice.actions
export default uiSlice.reducer
