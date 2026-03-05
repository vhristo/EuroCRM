'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  Delete,
  Edit,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useReorderCustomFieldsMutation,
} from '@/store/api/customFieldsApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import type { ICustomFieldDefinition, CustomFieldEntityType, CustomFieldType } from '@/types/customField'

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (single)' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

const ENTITY_TABS: { value: CustomFieldEntityType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'deals', label: 'Deals' },
  { value: 'leads', label: 'Leads' },
]

// ─── Form schema for the dialog ──────────────────────────────────────────────

const FieldFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Required')
      .max(64)
      .regex(
        /^[a-z][a-z0-9_]*$/,
        'Lowercase letters, numbers and underscores only; must start with a letter'
      ),
    label: z.string().min(1, 'Required').max(128),
    type: z.enum([
      'text', 'number', 'date', 'select', 'multiselect',
      'checkbox', 'url', 'email', 'phone',
    ] as const),
    required: z.boolean(),
    options: z.array(z.object({ value: z.string().min(1, 'Option cannot be empty') })),
  })
  .refine(
    (data) => {
      if (data.type === 'select' || data.type === 'multiselect') {
        return data.options.length >= 1
      }
      return true
    },
    { message: 'Add at least one option', path: ['options'] }
  )

type FieldFormValues = z.infer<typeof FieldFormSchema>

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  open,
  fieldLabel,
  onConfirm,
  onClose,
  isLoading,
}: {
  open: boolean
  fieldLabel: string
  onConfirm: () => void
  onClose: () => void
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Custom Field</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mt: 1 }}>
          Delete <strong>{fieldLabel}</strong>? Existing data stored in this field will be
          permanently lost from all records.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Field Dialog (create / edit) ────────────────────────────────────────────

function FieldDialog({
  open,
  field,
  entityType,
  onClose,
}: {
  open: boolean
  field: ICustomFieldDefinition | null // null = create mode
  entityType: CustomFieldEntityType
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const [createField, { isLoading: isCreating }] = useCreateCustomFieldMutation()
  const [updateField, { isLoading: isUpdating }] = useUpdateCustomFieldMutation()
  const isSubmitting = isCreating || isUpdating
  const isEditing = field !== null

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FieldFormValues>({
    resolver: zodResolver(FieldFormSchema),
    defaultValues: {
      name: field?.name ?? '',
      label: field?.label ?? '',
      type: field?.type ?? 'text',
      required: field?.required ?? false,
      options: field?.options?.map((v) => ({ value: v })) ?? [],
    },
  })

  const { fields: optionFields, append, remove } = useFieldArray({
    control,
    name: 'options',
  })

  const watchedType = watch('type')
  const needsOptions = watchedType === 'select' || watchedType === 'multiselect'

  const onSubmit = async (data: FieldFormValues) => {
    const options = needsOptions ? data.options.map((o) => o.value) : undefined

    try {
      if (isEditing && field) {
        await updateField({
          id: field.id,
          entityType,
          data: {
            label: data.label,
            type: data.type,
            required: data.required,
            options,
          },
        }).unwrap()
        dispatch(addNotification({ type: 'success', message: 'Custom field updated.' }))
      } else {
        await createField({
          name: data.name,
          label: data.label,
          type: data.type,
          entityType,
          required: data.required,
          options,
        }).unwrap()
        dispatch(addNotification({ type: 'success', message: 'Custom field created.' }))
      }
      onClose()
    } catch {
      dispatch(
        addNotification({
          type: 'error',
          message: isEditing ? 'Failed to update field.' : 'Failed to create field.',
        })
      )
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Custom Field' : 'New Custom Field'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            {/* Name — immutable after creation */}
            <TextField
              label="Field Name (internal key)"
              size="small"
              fullWidth
              disabled={isEditing}
              required={!isEditing}
              error={Boolean(errors.name)}
              helperText={
                errors.name?.message ??
                (isEditing
                  ? 'Field name cannot be changed after creation'
                  : 'Lowercase letters, numbers and underscores. e.g. linkedin_url')
              }
              {...register('name')}
            />

            <TextField
              label="Display Label"
              size="small"
              fullWidth
              required
              error={Boolean(errors.label)}
              helperText={errors.label?.message}
              {...register('label')}
            />

            <Controller
              name="type"
              control={control}
              render={({ field: f }) => (
                <FormControl size="small" fullWidth required error={Boolean(errors.type)}>
                  <InputLabel>Field Type</InputLabel>
                  <Select {...f} label="Field Type" disabled={isEditing}>
                    {FIELD_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {isEditing ? 'Field type cannot be changed after creation' : errors.type?.message}
                  </FormHelperText>
                </FormControl>
              )}
            />

            <Controller
              name="required"
              control={control}
              render={({ field: f }) => (
                <FormControlLabel
                  label="Required"
                  control={<Checkbox {...f} checked={f.value} size="small" />}
                />
              )}
            />

            {needsOptions && (
              <Box>
                <Typography variant="body2" fontWeight={500} mb={1}>
                  Options
                </Typography>
                <Stack spacing={1}>
                  {optionFields.map((optField, idx) => (
                    <Stack key={optField.id} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={`Option ${idx + 1}`}
                        error={Boolean(errors.options?.[idx]?.value)}
                        helperText={errors.options?.[idx]?.value?.message}
                        {...register(`options.${idx}.value`)}
                      />
                      <IconButton size="small" onClick={() => remove(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  {errors.options?.root && (
                    <Typography variant="caption" color="error">
                      {errors.options.root.message}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => append({ value: '' })}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Option
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Field'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

// ─── Fields Table ─────────────────────────────────────────────────────────────

function FieldsTable({
  fields,
  entityType,
}: {
  fields: ICustomFieldDefinition[]
  entityType: CustomFieldEntityType
}) {
  const dispatch = useAppDispatch()
  const [deleteField, { isLoading: isDeleting }] = useDeleteCustomFieldMutation()
  const [reorder] = useReorderCustomFieldsMutation()

  const [editTarget, setEditTarget] = useState<ICustomFieldDefinition | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ICustomFieldDefinition | null>(null)

  const sorted = [...fields].sort((a, b) => a.order - b.order)

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = sorted.findIndex((f) => f.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const reordered = sorted.map((f, i) => {
      if (i === idx) return { id: f.id, order: sorted[swapIdx].order }
      if (i === swapIdx) return { id: f.id, order: sorted[idx].order }
      return { id: f.id, order: f.order }
    })

    try {
      await reorder({ entityType, data: { items: reordered } }).unwrap()
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to reorder fields.' }))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteField({ id: deleteTarget.id, entityType }).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Custom field deleted.' }))
      setDeleteTarget(null)
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete field.' }))
    }
  }

  if (sorted.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No custom fields yet. Click &ldquo;Add Field&rdquo; to create one.
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Order</TableCell>
            <TableCell>Label</TableCell>
            <TableCell>Name (key)</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Required</TableCell>
            <TableCell>Options</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((field, idx) => (
            <TableRow key={field.id} hover>
              <TableCell>
                <Stack direction="row" spacing={0}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        size="small"
                        disabled={idx === 0}
                        onClick={() => handleMove(field.id, 'up')}
                      >
                        <KeyboardArrowUp fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        disabled={idx === sorted.length - 1}
                        onClick={() => handleMove(field.id, 'down')}
                      >
                        <KeyboardArrowDown fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell>{field.label}</TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                  {field.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
              <TableCell>
                {field.options && field.options.length > 0 ? (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {field.options.join(', ')}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    —
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setEditTarget(field)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(field)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit dialog */}
      <FieldDialog
        open={editTarget !== null}
        field={editTarget}
        entityType={entityType}
        onClose={() => setEditTarget(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        fieldLabel={deleteTarget?.label ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CustomFieldBuilder() {
  const [activeTab, setActiveTab] = useState<CustomFieldEntityType>('contacts')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: fields = [], isLoading, isError } = useGetCustomFieldsQuery(activeTab)

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Custom Fields</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="small"
          onClick={() => setDialogOpen(true)}
        >
          Add Field
        </Button>
      </Stack>

      <Tabs
        value={activeTab}
        onChange={(_e, val: CustomFieldEntityType) => setActiveTab(val)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {ENTITY_TABS.map((t) => (
          <Tab key={t.value} label={t.label} value={t.value} />
        ))}
      </Tabs>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Failed to load custom fields. Please try again.</Alert>
      )}

      {!isLoading && !isError && (
        <FieldsTable fields={fields} entityType={activeTab} />
      )}

      {/* Create dialog */}
      <FieldDialog
        open={dialogOpen}
        field={null}
        entityType={activeTab}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  )
}
