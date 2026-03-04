'use client'

import { Backdrop, Box, CircularProgress, Typography } from '@mui/material'

interface LoadingOverlayProps {
  /** When true, renders a full-screen Backdrop with a spinner */
  open: boolean
  /** Optional label shown beneath the spinner */
  message?: string
}

export function LoadingOverlay({ open, message }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={open}
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.modal + 1,
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CircularProgress color="inherit" />
      {message && (
        <Typography variant="body2" sx={{ color: 'inherit', opacity: 0.9 }}>
          {message}
        </Typography>
      )}
    </Backdrop>
  )
}

export default LoadingOverlay
