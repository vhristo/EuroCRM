'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  Box,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import { useAuth } from '@/hooks/useAuth'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import { useSwitchOrganizationMutation } from '@/store/api/organizationsApi'
import { useOrganizationSwitch } from '@/hooks/useOrganizationSwitch'
import CreateOrganizationDialog from './CreateOrganizationDialog'

export default function CompanyManager() {
  const dispatch = useAppDispatch()
  const { user, organizations } = useAuth()
  const { applySession } = useOrganizationSwitch()
  const [switchOrganization, { isLoading }] = useSwitchOrganizationMutation()
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleSwitch = async (organizationId: string) => {
    setPendingId(organizationId)
    try {
      const session = await switchOrganization({ organizationId }).unwrap()
      applySession(session)
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Could not switch company.' }))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box className="flex items-start justify-between gap-4 mb-1">
          <Box>
            <Typography variant="h6">Your companies</Typography>
            <Typography variant="body2" color="text.secondary">
              Each company keeps its own contacts, deals and settings. Only the
              active company is visible anywhere else in the app.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Create
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <List disablePadding>
          {organizations.map((org) => {
            const isActive = org.id === user?.organizationId
            const isPending = pendingId === org.id
            return (
              <ListItem
                key={org.id}
                divider
                secondaryAction={
                  isActive ? (
                    <Chip label="Active" size="small" color="primary" />
                  ) : (
                    <Button
                      size="small"
                      onClick={() => handleSwitch(org.id)}
                      disabled={isLoading}
                      startIcon={
                        isPending ? <CircularProgress size={14} color="inherit" /> : null
                      }
                    >
                      Switch
                    </Button>
                  )
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {isActive ? (
                    <CheckCircleIcon color="primary" fontSize="small" />
                  ) : (
                    <BusinessIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={org.name}
                  secondary={`Your role: ${org.role.replace('_', ' ')}`}
                />
              </ListItem>
            )
          })}
        </List>
      </CardContent>

      <CreateOrganizationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Card>
  )
}
