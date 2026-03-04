'use client'

import { useRouter } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Box,
  Avatar,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAppDispatch } from '@/store/hooks'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { clearCredentials } from '@/store/slices/authSlice'
import { useAuth } from '@/hooks/useAuth'

export default function TopBar() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user } = useAuth()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with local logout even if request fails
    } finally {
      dispatch(clearCredentials())
      router.push('/login')
    }
  }

  const initials =
    user
      ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
      : '??'

  const fullName =
    user ? `${user.firstName} ${user.lastName}` : ''

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Hamburger — visible on mobile to toggle drawer */}
        <IconButton
          edge="start"
          aria-label="toggle sidebar"
          onClick={() => dispatch(toggleSidebar())}
          sx={{ display: { md: 'none' }, mr: 0.5 }}
        >
          <MenuIcon />
        </IconButton>

        {/* App title */}
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, flexGrow: 1, color: 'primary.main' }}
        >
          EuroCRM
        </Typography>

        {/* User section */}
        <Box className="flex items-center gap-3">
          {fullName && (
            <Box className="hidden sm:flex items-center gap-2">
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fullName}
              </Typography>
            </Box>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
