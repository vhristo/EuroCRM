'use client'

import { useState } from 'react'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Typography,
  Checkbox,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Groups as MeetingIcon,
  Task as TaskIcon,
  Note as NoteIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { formatDateTime } from '@/utils/formatters'
import {
  useGetActivitiesQuery,
  useToggleActivityDoneMutation,
  useDeleteActivityMutation,
} from '@/store/api/activitiesApi'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const typeIcons: Record<string, React.ReactElement> = {
  call: <PhoneIcon fontSize="small" />,
  email: <EmailIcon fontSize="small" />,
  meeting: <MeetingIcon fontSize="small" />,
  task: <TaskIcon fontSize="small" />,
  note: <NoteIcon fontSize="small" />,
}

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
  call: 'primary',
  email: 'info',
  meeting: 'secondary',
  task: 'warning',
  note: 'success',
}

interface ActivityTimelineProps {
  contactId?: string
  dealId?: string
  doneFilter?: string
}

export default function ActivityTimeline({ contactId, dealId, doneFilter }: ActivityTimelineProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const params: Record<string, string> = {}
  if (contactId) params.contactId = contactId
  if (dealId) params.dealId = dealId
  if (doneFilter !== undefined) params.done = doneFilter

  const { data, isLoading } = useGetActivitiesQuery(params)
  const [toggleDone] = useToggleActivityDoneMutation()
  const [deleteActivity] = useDeleteActivityMutation()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget)
    setMenuId(id)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setMenuId(null)
  }

  if (isLoading) {
    return <Typography color="text.secondary">Loading activities...</Typography>
  }

  const activities = data?.items ?? []

  if (activities.length === 0) {
    return (
      <Typography color="text.secondary" className="py-4 text-center">
        No activities yet
      </Typography>
    )
  }

  return (
    <>
      <List disablePadding>
        {activities.map((activity) => (
          <ListItem
            key={activity.id ?? (activity as unknown as Record<string, unknown>)._id}
            className={`rounded-lg mb-2 ${activity.done ? 'opacity-60' : ''}`}
            sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            secondaryAction={
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, (activity.id ?? (activity as unknown as Record<string, unknown>)._id) as string)}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Checkbox
                edge="start"
                checked={activity.done}
                onChange={() => toggleDone((activity.id ?? (activity as unknown as Record<string, unknown>)._id) as string)}
                size="small"
              />
            </ListItemIcon>
            <ListItemIcon sx={{ minWidth: 36 }}>
              {typeIcons[activity.type] ?? <NoteIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={
                <div className="flex items-center gap-2">
                  <span className={activity.done ? 'line-through' : ''}>
                    {activity.subject}
                  </span>
                  <Chip
                    label={activity.type}
                    size="small"
                    color={typeColors[activity.type] ?? 'default'}
                    variant="outlined"
                  />
                </div>
              }
              secondary={
                <span className="text-sm text-gray-500">
                  {activity.dueDate
                    ? `Due: ${formatDateTime(activity.dueDate)}`
                    : `Created: ${formatDateTime(activity.createdAt)}`}
                  {activity.description && ` — ${activity.description}`}
                </span>
              }
            />
          </ListItem>
        ))}
      </List>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteId(menuId)
            handleMenuClose()
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Activity"
        message="Are you sure you want to delete this activity?"
        onConfirm={async () => {
          if (deleteId) await deleteActivity(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
