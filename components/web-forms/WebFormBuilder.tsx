'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { nanoid } from 'nanoid'
import type { IWebForm, IWebFormField } from '@/types/webForm'

type FieldType = IWebFormField['type']
type MapTo = IWebFormField['mapTo']

interface WebFormBuilderProps {
  value: Partial<IWebForm>
  onChange: (form: Partial<IWebForm>) => void
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
]

const MAP_TO_OPTIONS: { value: MapTo; label: string }[] = [
  { value: undefined, label: '— None —' },
  { value: 'name', label: 'Lead Name' },
  { value: 'email', label: 'Lead Email' },
  { value: 'phone', label: 'Lead Phone' },
  { value: 'company', label: 'Lead Company' },
  { value: 'notes', label: 'Lead Notes' },
]

export default function WebFormBuilder({ value, onChange }: WebFormBuilderProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null)

  const fields: IWebFormField[] = value.fields ?? []
  const styling = value.styling ?? {
    primaryColor: '#1976d2',
    backgroundColor: '#ffffff',
    buttonText: 'Submit',
  }

  function setTop(patch: Partial<IWebForm>) {
    onChange({ ...value, ...patch })
  }

  function setStyling(patch: Partial<IWebForm['styling']>) {
    setTop({ styling: { ...styling, ...patch } })
  }

  function setFields(next: IWebFormField[]) {
    setTop({ fields: next })
  }

  function addField() {
    const newField: IWebFormField = {
      id: nanoid(),
      name: `field_${nanoid(4)}`,
      label: 'New Field',
      type: 'text',
      required: false,
      order: fields.length,
    }
    setFields([...fields, newField])
    setExpandedField(newField.id)
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })))
    if (expandedField === id) setExpandedField(null)
  }

  function moveField(id: string, direction: 'up' | 'down') {
    const idx = fields.findIndex((f) => f.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setFields(next.map((f, i) => ({ ...f, order: i })))
  }

  function updateField(id: string, patch: Partial<IWebFormField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function updateFieldOptions(id: string, rawOptions: string) {
    const options = rawOptions
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean)
    updateField(id, { options })
  }

  return (
    <Stack spacing={3}>
      {/* Basic Info */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Form Details
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Form Name"
              value={value.name ?? ''}
              onChange={(e) => setTop({ name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description (optional)"
              value={value.description ?? ''}
              onChange={(e) => setTop({ description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Success Message"
              value={value.successMessage ?? ''}
              onChange={(e) => setTop({ successMessage: e.target.value })}
              helperText="Shown to visitors after successful submission"
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Styling */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Styling
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Primary Color
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <input
                  type="color"
                  value={styling.primaryColor}
                  onChange={(e) => setStyling({ primaryColor: e.target.value })}
                  style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
                <TextField
                  size="small"
                  value={styling.primaryColor}
                  onChange={(e) => setStyling({ primaryColor: e.target.value })}
                  inputProps={{ maxLength: 7 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Background Color
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <input
                  type="color"
                  value={styling.backgroundColor}
                  onChange={(e) => setStyling({ backgroundColor: e.target.value })}
                  style={{ width: 40, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
                <TextField
                  size="small"
                  value={styling.backgroundColor}
                  onChange={(e) => setStyling({ backgroundColor: e.target.value })}
                  inputProps={{ maxLength: 7 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
            <Box flex={1}>
              <TextField
                label="Button Text"
                value={styling.buttonText}
                onChange={(e) => setStyling({ buttonText: e.target.value })}
                size="small"
                fullWidth
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Fields
              <Chip label={fields.length} size="small" sx={{ ml: 1 }} />
            </Typography>
            <Button startIcon={<AddIcon />} onClick={addField} variant="outlined" size="small">
              Add Field
            </Button>
          </Box>

          {fields.length === 0 && (
            <Box
              py={4}
              textAlign="center"
              border="2px dashed"
              borderColor="divider"
              borderRadius={2}
            >
              <Typography color="text.secondary">
                No fields yet. Click &quot;Add Field&quot; to get started.
              </Typography>
            </Box>
          )}

          <Stack spacing={1}>
            {fields.map((field, idx) => {
              const isExpanded = expandedField === field.id
              return (
                <Card
                  key={field.id}
                  variant="outlined"
                  sx={{ borderColor: isExpanded ? 'primary.main' : 'divider' }}
                >
                  {/* Field header row */}
                  <Box
                    display="flex"
                    alignItems="center"
                    px={1.5}
                    py={1}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedField(isExpanded ? null : field.id)}
                  >
                    <DragIndicatorIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {field.label || 'Untitled Field'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                        {field.required && ' · Required'}
                        {field.mapTo && ` · → ${field.mapTo}`}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up') }}
                        disabled={idx === 0}
                      >
                        <KeyboardArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down') }}
                        disabled={idx === fields.length - 1}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); removeField(field.id) }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Expanded field editor */}
                  {isExpanded && (
                    <>
                      <Divider />
                      <Box p={2}>
                        <Stack spacing={2}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Label"
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              size="small"
                              fullWidth
                              required
                            />
                            <TextField
                              label="Field Name (internal)"
                              value={field.name}
                              onChange={(e) =>
                                updateField(field.id, {
                                  name: e.target.value.replace(/\s+/g, '_').toLowerCase(),
                                })
                              }
                              size="small"
                              fullWidth
                              helperText="Used in form submission data"
                            />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Field Type"
                              select
                              value={field.type}
                              onChange={(e) =>
                                updateField(field.id, { type: e.target.value as FieldType })
                              }
                              size="small"
                              fullWidth
                            >
                              {FIELD_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                  {t.label}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              label="Maps To Lead Field"
                              select
                              value={field.mapTo ?? ''}
                              onChange={(e) =>
                                updateField(field.id, {
                                  mapTo: (e.target.value as MapTo) || undefined,
                                })
                              }
                              size="small"
                              fullWidth
                              helperText="Auto-fills this Lead field on submission"
                            >
                              {MAP_TO_OPTIONS.map((o) => (
                                <MenuItem key={String(o.value)} value={o.value ?? ''}>
                                  {o.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Stack>
                          {field.type === 'select' && (
                            <TextField
                              label="Options (one per line)"
                              value={(field.options ?? []).join('\n')}
                              onChange={(e) => updateFieldOptions(field.id, e.target.value)}
                              multiline
                              rows={3}
                              size="small"
                              fullWidth
                              helperText="Enter each dropdown option on a new line"
                            />
                          )}
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.required}
                                onChange={(e) =>
                                  updateField(field.id, { required: e.target.checked })
                                }
                                size="small"
                              />
                            }
                            label="Required field"
                          />
                        </Stack>
                      </Box>
                    </>
                  )}
                </Card>
              )
            })}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
