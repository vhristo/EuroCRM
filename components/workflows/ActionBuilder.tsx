'use client'

import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import type { IWorkflowAction, WorkflowActionType } from '@/types/workflow'

const ACTION_TYPE_OPTIONS: { value: WorkflowActionType; label: string }[] = [
  { value: 'create_activity', label: 'Create Activity' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'assign_owner', label: 'Assign Owner' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'send_webhook', label: 'Send Webhook' },
]

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
]

interface ActionBuilderProps {
  actions: IWorkflowAction[]
  onChange: (actions: IWorkflowAction[]) => void
  errors?: Record<number, string>
}

export default function ActionBuilder({ actions, onChange, errors }: ActionBuilderProps) {
  const handleAdd = () => {
    onChange([...actions, { type: 'create_activity', config: {} }])
  }

  const handleRemove = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
  }

  const handleTypeChange = (index: number, type: WorkflowActionType) => {
    const updated = actions.map((a, i) =>
      i === index ? { type, config: {} } : a
    )
    onChange(updated)
  }

  const handleConfigChange = (
    index: number,
    key: string,
    value: string
  ) => {
    const updated = actions.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, [key]: value } } : a
    )
    onChange(updated)
  }

  const getConfigValue = (action: IWorkflowAction, key: string): string => {
    const val = action.config[key]
    return val !== undefined ? String(val) : ''
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Actions{' '}
        <Typography component="span" variant="caption" color="text.disabled">
          (executed in order)
        </Typography>
      </Typography>

      <Box className="flex flex-col gap-3 mb-3">
        {actions.map((action, index) => (
          <Box
            key={index}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}
          >
            <Box className="flex items-center justify-between mb-2">
              <Typography variant="caption" color="text.secondary">
                Action {index + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemove(index)}
                aria-label="Remove action"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            {errors?.[index] && (
              <Typography variant="caption" color="error" display="block" mb={1}>
                {errors[index]}
              </Typography>
            )}

            {/* Action type selector */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={action.type}
                label="Action Type"
                onChange={(e: SelectChangeEvent) =>
                  handleTypeChange(index, e.target.value as WorkflowActionType)
                }
              >
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ mb: 2 }} />

            {/* Config fields per action type */}
            {action.type === 'create_activity' && (
              <Box className="flex flex-col gap-2">
                <FormControl fullWidth size="small">
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={getConfigValue(action, 'type')}
                    label="Activity Type"
                    onChange={(e: SelectChangeEvent) =>
                      handleConfigChange(index, 'type', e.target.value)
                    }
                  >
                    {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  fullWidth
                  label="Subject (supports {{field}} placeholders)"
                  value={getConfigValue(action, 'subject')}
                  onChange={(e) => handleConfigChange(index, 'subject', e.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  label="Description (optional)"
                  value={getConfigValue(action, 'description')}
                  onChange={(e) => handleConfigChange(index, 'description', e.target.value)}
                />
              </Box>
            )}

            {action.type === 'send_email' && (
              <Box className="flex flex-col gap-2">
                <TextField
                  size="small"
                  fullWidth
                  label="To (email or {{email}} placeholder)"
                  value={getConfigValue(action, 'to')}
                  onChange={(e) => handleConfigChange(index, 'to', e.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Subject"
                  value={getConfigValue(action, 'subject')}
                  onChange={(e) => handleConfigChange(index, 'subject', e.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  label="Body (supports {{field}} placeholders)"
                  value={getConfigValue(action, 'body')}
                  onChange={(e) => handleConfigChange(index, 'body', e.target.value)}
                />
              </Box>
            )}

            {action.type === 'update_field' && (
              <Box className="flex gap-2">
                <TextField
                  size="small"
                  label="Field Name"
                  value={getConfigValue(action, 'field')}
                  onChange={(e) => handleConfigChange(index, 'field', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="New Value"
                  value={getConfigValue(action, 'value')}
                  onChange={(e) => handleConfigChange(index, 'value', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            {action.type === 'assign_owner' && (
              <TextField
                size="small"
                fullWidth
                label="Owner ID"
                value={getConfigValue(action, 'ownerId')}
                onChange={(e) => handleConfigChange(index, 'ownerId', e.target.value)}
                helperText="User ID to assign as owner"
              />
            )}

            {action.type === 'add_tag' && (
              <TextField
                size="small"
                fullWidth
                label="Tag"
                value={getConfigValue(action, 'tag')}
                onChange={(e) => handleConfigChange(index, 'tag', e.target.value)}
                helperText="Tag to add to the contact or lead"
              />
            )}

            {action.type === 'send_webhook' && (
              <Box className="flex flex-col gap-2">
                <TextField
                  size="small"
                  fullWidth
                  label="Webhook URL"
                  value={getConfigValue(action, 'url')}
                  onChange={(e) => handleConfigChange(index, 'url', e.target.value)}
                  placeholder="https://hooks.example.com/..."
                />
                <Typography variant="caption" color="text.secondary">
                  A POST request will be sent with the trigger entity as JSON payload.
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={handleAdd}
        variant="outlined"
        color="primary"
      >
        Add Action
      </Button>
    </Box>
  )
}
