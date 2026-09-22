'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  ListSubheader,
  CircularProgress,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import CheckIcon from '@mui/icons-material/Check'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useAppDispatch } from '@/store/hooks'
import { toggleSidebar, addNotification } from '@/store/slices/uiSlice'
import { clearCredentials } from '@/store/slices/authSlice'
import { baseApi } from '@/store/api/baseApi'
import { useSwitchOrganizationMutation } from '@/store/api/organizationsApi'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizationSwitch } from '@/hooks/useOrganizationSwitch'
import CreateOrganizationDialog from '@/components/organizations/CreateOrganizationDialog'

export default function TopBar() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, accessToken, organizations, activeOrganization } = useAuth()
  const { applySession } = useOrganizationSwitch()
  const [switchOrganization, { isLoading: isSwitching }] = useSwitchOrganizationMutation()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const closeMenu = () => setAnchorEl(null)

  const handleLogout = async () => {
    closeMenu()
    try {
      // The Authorization header is required: middleware guards /api/auth/logout,
      // so without it the request never reaches the handler and the refresh token
      // is never revoked.
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
      })
    } catch {
      // Proceed with local logout even if request fails
    } finally {
      dispatch(clearCredentials())
      // Otherwise the next account signing in here is served this one's cache.
      dispatch(baseApi.util.resetApiState())
      router.push('/login')
    }
  }

  const handleSwitch = async (organizationId: string) => {
    closeMenu()
    if (organizationId === user?.organizationId) return

    try {
      const session = await switchOrganization({ organizationId }).unwrap()
      applySession(session)
    } catch {
      dispatch(
        addNotification({ type: 'error', message: 'Could not switch company.' })
      )
    }
  }

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '??'

  const fullName = user ? `${user.firstName} ${user.lastName}` : ''

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
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          EuroCRM
        </Typography>

        {/* Active company — the ambient signal for which tenant is being edited */}
        {activeOrganization && (
          <Box className="hidden sm:flex items-center gap-1.5" sx={{ minWidth: 0 }}>
            <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 1 }} />
            <BusinessIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, color: 'text.secondary' }}
            >
              {activeOrganization.name}
            </Typography>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Account menu */}
        <Box
          component="button"
          type="button"
          aria-label="account menu"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={isSwitching}
          className="flex items-center gap-2"
          sx={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderRadius: 1,
            px: 1,
            py: 0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {isSwitching ? <CircularProgress size={16} color="inherit" /> : initials}
          </Avatar>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}
          >
            {fullName}
          </Typography>
          <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 260, maxWidth: 320 } } }}
        >
          <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>
            {user?.email}
          </ListSubheader>

          <Divider />

          <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>
            Companies
          </ListSubheader>

          {organizations.map((org) => {
            const isActive = org.id === user?.organizationId
            return (
              <MenuItem
                key={org.id}
                selected={isActive}
                onClick={() => handleSwitch(org.id)}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {isActive ? <CheckIcon fontSize="small" color="primary" /> : null}
                </ListItemIcon>
                <ListItemText
                  primary={org.name}
                  primaryTypographyProps={{ noWrap: true }}
                />
                <Chip
                  label={org.role.replace('_', ' ')}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }}
                />
              </MenuItem>
            )
          })}

          <Divider />

          <MenuItem
            onClick={() => {
              closeMenu()
              setCreateOpen(true)
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Create company" />
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>
      </Toolbar>

      <CreateOrganizationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppBar>
  )
}
