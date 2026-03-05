'use client'

import { Alert, Snackbar } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { removeNotification } from '@/store/slices/uiSlice'

export default function NotificationSnackbar() {
  const dispatch = useAppDispatch()
  const notifications = useAppSelector((state) => state.ui.notifications)
  const current = notifications[0]

  if (!current) return null

  return (
    <Snackbar
      open
      autoHideDuration={4000}
      onClose={() => dispatch(removeNotification(current.id))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={() => dispatch(removeNotification(current.id))}
        severity={current.type}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {current.message}
      </Alert>
    </Snackbar>
  )
}
