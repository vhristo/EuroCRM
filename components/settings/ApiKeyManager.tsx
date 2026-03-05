'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import {
  Add,
  Delete,
  ContentCopy,
  Check,
  Key,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  useGetApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  type CreateApiKeyResponse,
} from '@/store/api/apiKeysApi'
import type { IApiKey } from '@/types/apiKey'
import { API_KEY_PERMISSIONS } from '@/types/apiKey'

// ── Form validation ──────────────────────────────────────────────────────────

const CreateApiKeyFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
  expiresAt: z.string().optional(),
})

type CreateApiKeyFormValues = z.infer<typeof CreateApiKeyFormSchema>

// ── Permission labels ─────────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<string, string> = {
  'contacts:read': 'Contacts — Read',
  'contacts:write': 'Contacts — Write',
  'contacts:delete': 'Contacts — Delete',
  'deals:read': 'Deals — Read',
  'deals:write': 'Deals — Write',
  'deals:delete': 'Deals — Delete',
  'leads:read': 'Leads — Read',
  'leads:write': 'Leads — Write',
  'leads:delete': 'Leads — Delete',
  'activities:read': 'Activities — Read',
  'activities:write': 'Activities — Write',
  'activities:delete': 'Activities — Delete',
  'pipelines:read': 'Pipelines — Read',
}

// ── Subcomponent: Created key display ────────────────────────────────────────

interface CreatedKeyDialogProps {
  open: boolean
  keyData: CreateApiKeyResponse
  onClose: () => void
}

function CreatedKeyDialog({ open, keyData, onClose }: CreatedKeyDialogProps) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyData.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Key Created</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Copy this key now. It will not be shown again.
        </Alert>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {keyData.name}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
          }}
        >
          <Box flex={1}>{revealed ? keyData.key : '•'.repeat(keyData.key.length)}</Box>
          <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
            <IconButton size="small" onClick={() => setRevealed((v) => !v)}>
              {revealed ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={copied ? 'Copied!' : 'Copy key'}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Permissions:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
            {keyData.permissions.map((p) => (
              <Chip key={p} label={PERMISSION_LABELS[p] ?? p} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCopy} startIcon={copied ? <Check /> : <ContentCopy />}>
          {copied ? 'Copied!' : 'Copy Key'}
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Subcomponent: Create form dialog ─────────────────────────────────────────

interface CreateApiKeyDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (key: CreateApiKeyResponse) => void
}

function CreateApiKeyDialog({ open, onClose, onCreated }: CreateApiKeyDialogProps) {
  const [createApiKey, { isLoading }] = useCreateApiKeyMutation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(CreateApiKeyFormSchema),
    defaultValues: { name: '', permissions: [], expiresAt: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: CreateApiKeyFormValues) => {
    const result = await createApiKey({
      name: values.name,
      permissions: values.permissions,
      expiresAt: values.expiresAt || undefined,
    })

    if ('data' in result && result.data) {
      reset()
      onCreated(result.data)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            {...register('name')}
            label="Key Name"
            placeholder="e.g. My Integration"
            fullWidth
            margin="normal"
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <TextField
            {...register('expiresAt')}
            label="Expires At (optional)"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!!errors.expiresAt}
            helperText={errors.expiresAt?.message ?? 'Leave blank for no expiry'}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Permissions
          </Typography>

          {errors.permissions && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errors.permissions.message}
            </Alert>
          )}

          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <FormGroup>
                {API_KEY_PERMISSIONS.map((perm) => (
                  <FormControlLabel
                    key={perm}
                    control={
                      <Checkbox
                        checked={field.value.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, perm])
                          } else {
                            field.onChange(field.value.filter((p) => p !== perm))
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">{PERMISSION_LABELS[perm] ?? perm}</Typography>
                    }
                  />
                ))}
              </FormGroup>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={20} /> : 'Create Key'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ApiKeyManager() {
  const { data, isLoading } = useGetApiKeysQuery()
  const [deleteApiKey] = useDeleteApiKeyMutation()
  const [createOpen, setCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return
    await deleteApiKey(id)
  }

  const columns: GridColDef<IApiKey>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Key fontSize="small" color="action" />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              {params.row.keyPrefix}…
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'permissions',
      headerName: 'Permissions',
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {params.row.permissions.slice(0, 3).map((p) => (
            <Chip key={p} label={PERMISSION_LABELS[p] ?? p} size="small" variant="outlined" />
          ))}
          {params.row.permissions.length > 3 && (
            <Chip
              label={`+${params.row.permissions.length - 3} more`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      ),
    },
    {
      field: 'lastUsedAt',
      headerName: 'Last Used',
      width: 160,
      renderCell: (params) =>
        params.row.lastUsedAt
          ? format(new Date(params.row.lastUsedAt), 'dd MMM yyyy HH:mm')
          : 'Never',
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 140,
      renderCell: (params) => {
        if (!params.row.expiresAt) return 'Never'
        const expires = new Date(params.row.expiresAt)
        const isExpired = expires < new Date()
        return (
          <Typography variant="body2" color={isExpired ? 'error.main' : 'text.primary'}>
            {format(expires, 'dd MMM yyyy')}
          </Typography>
        )
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 140,
      renderCell: (params) => format(new Date(params.row.createdAt), 'dd MMM yyyy'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Revoke key">
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id, params.row.name)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6">API Keys</Typography>
          <Typography variant="body2" color="text.secondary">
            Authenticate external integrations with the EuroCRM REST API
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
        >
          Create Key
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <DataGrid
        rows={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        autoHeight
        pageSizeOptions={[10, 25]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        disableRowSelectionOnClick
        sx={{ border: 'none' }}
      />

      <CreateApiKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(key) => {
          setCreateOpen(false)
          setCreatedKey(key)
        }}
      />

      {createdKey && (
        <CreatedKeyDialog
          open
          keyData={createdKey}
          onClose={() => setCreatedKey(null)}
        />
      )}
    </Box>
  )
}
