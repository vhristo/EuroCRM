'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import PeopleIcon from '@mui/icons-material/People'
import HandshakeIcon from '@mui/icons-material/Handshake'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import EventNoteIcon from '@mui/icons-material/EventNote'
import EmailIcon from '@mui/icons-material/Email'
import BarChartIcon from '@mui/icons-material/BarChart'
import SettingsIcon from '@mui/icons-material/Settings'
import DynamicFormIcon from '@mui/icons-material/DynamicForm'
import CampaignIcon from '@mui/icons-material/Campaign'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSidebarOpen } from '@/store/slices/uiSlice'
import { useTheme, useMediaQuery } from '@mui/material'

const DRAWER_WIDTH = 240

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Pipeline', href: '/pipeline', icon: <ViewKanbanIcon /> },
  { label: 'Contacts', href: '/contacts', icon: <PeopleIcon /> },
  { label: 'Deals', href: '/deals', icon: <HandshakeIcon /> },
  { label: 'Leads', href: '/leads', icon: <LeaderboardIcon /> },
  { label: 'Activities', href: '/activities', icon: <EventNoteIcon /> },
  { label: 'Email', href: '/email', icon: <EmailIcon /> },
  { label: 'Campaigns', href: '/campaigns', icon: <CampaignIcon /> },
  { label: 'Web Forms', href: '/web-forms', icon: <DynamicFormIcon /> },
  { label: 'Automations', href: '/workflows', icon: <SmartToyIcon /> },
  { label: 'Reports', href: '/reports', icon: <BarChartIcon /> },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleClose = () => {
    dispatch(setSidebarOpen(false))
    onClose()
  }

  const drawerContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <Box className="flex items-center px-4 py-5">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}
          >
            EC
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          EuroCRM
        </Typography>
      </Box>

      <Divider />

      {/* Navigation */}
      <List className="flex-1 py-2" disablePadding>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <ListItem key={item.href} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={isMobile ? handleClose : undefined}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.50',
                    color: 'primary.700',
                    '& .MuiListItemIcon-root': { color: 'primary.600' },
                    '&:hover': { bgcolor: 'primary.100' },
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? 'primary.600' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      {/* Footer */}
      <Box className="px-4 py-3">
        <Typography variant="caption" color="text.disabled">
          EuroCRM v1.0
        </Typography>
      </Box>
    </div>
  )

  // Mobile: temporary drawer (slides in/out)
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={handleClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    )
  }

  // Desktop: permanent drawer
  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}
