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
  Switch,
  TextField,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import {
  Add,
  Delete,
  Edit,
  PlayArrow,
  History,
  Webhook,
  Check,
  ContentCopy,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  type CreateWebhookResponse,
} from '@/store/api/webhooksApi'
import type { IWebhook } from '@/types/webhook'
import { WEBHOOK_EVENTS } from '@/types/webhook'
import WebhookDeliveryLog from './WebhookDeliveryLog'

// ── Form schema ───────────────────────────────────────────────────────────────

const WebhookFormSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  active: z.boolean().optional(),
})

type WebhookFormValues = z.infer<typeof WebhookFormSchema>

// ── Event labels ──────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  'contact.created': 'Contact Created',
  'contact.updated': 'Contact Updated',
  'contact.deleted': 'Contact Deleted',
  'deal.created': 'Deal Created',
  'deal.updated': 'Deal Updated',
  'deal.won': 'Deal Won',
  'deal.lost': 'Deal Lost',
  'deal.deleted': 'Deal Deleted',
  'lead.created': 'Lead Created',
  'lead.updated': 'Lead Updated',
  'lead.converted': 'Lead Converted',
  'lead.deleted': 'Lead Deleted',
  'activity.created': 'Activity Created',
  'activity.completed': 'Activity Completed',
  'activity.deleted': 'Activity Deleted',
}

// ── Webhook secret reveal dialog (shown on creation) ─────────────────────────

interface WebhookSecretDialogProps {
  open: boolean
  data: CreateWebhookResponse
  onClose: () => void
}

function WebhookSecretDialog({ open, data, onClose }: WebhookSecretDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Webhook Created</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Save the signing secret now — it will not be shown again.
        </Alert>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Use this secret to verify incoming webhook signatures by checking the
          <code> X-Webhook-Signature</code> header (HMAC-SHA256).
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
            mt: 2,
          }}
        >
          <Box flex={1}>{data.secret}</Box>
          <Tooltip title={copied ? 'Copied!' : 'Copy secret'}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCopy} startIcon={copied ? <Check /> : <ContentCopy />}>
          {copied ? 'Copied!' : 'Copy Secret'}
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Create/Edit form dialog ───────────────────────────────────────────────────

interface WebhookFormDialogProps {
  open: boolean
  webhook?: IWebhook | null
  onClose: () => void
  onCreated: (data: CreateWebhookResponse) => void
}

function WebhookFormDialog({ open, webhook, onClose, onCreated }: WebhookFormDialogProps) {
  const isEdit = !!webhook
  const [createWebhook, { isLoading: isCreating }] = useCreateWebhookMutation()
  const [updateWebhook, { isLoading: isUpdating }] = useUpdateWebhookMutation()
  const isLoading = isCreating || isUpdating

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(WebhookFormSchema),
    defaultValues: {
      url: webhook?.url ?? '',
      events: webhook?.events ?? [],
      active: webhook?.active ?? true,
    },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: WebhookFormValues) => {
    if (isEdit && webhook) {
      const result = await updateWebhook({ id: webhook.id, data: values })
      if ('data' in result) handleClose()
    } else {
      const result = await createWebhook(values)
      if ('data' in result && result.data) {
        reset()
        onCreated(result.data)
      }
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isEdit ? 'Edit Webhook' : 'Create Webhook'}</DialogTitle>
        <DialogContent>
          <TextField
            {...register('url')}
            label="Endpoint URL"
            placeholder="https://example.com/webhook"
            fullWidth
            margin="normal"
            error={!!errors.url}
            helperText={errors.url?.message}
          />

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Events to subscribe
          </Typography>

          {errors.events && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errors.events.message}
            </Alert>
          )}

          <Controller
            name="events"
            control={control}
            render={({ field }) => (
              <FormGroup>
                {WEBHOOK_EVENTS.map((event) => (
                  <FormControlLabel
                    key={event}
                    control={
                      <Checkbox
                        checked={field.value.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, event])
                          } else {
                            field.onChange(field.value.filter((ev) => ev !== event))
                          }
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">{EVENT_LABELS[event] ?? event}</Typography>
                    }
                  />
                ))}
              </FormGroup>
            )}
          />

          {isEdit && (
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch checked={field.value ?? true} onChange={field.onChange} />
                  }
                  label="Active"
                  sx={{ mt: 2 }}
                />
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Webhook'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WebhookManager() {
  const { data, isLoading } = useGetWebhooksQuery()
  const [updateWebhook] = useUpdateWebhookMutation()
  const [deleteWebhook] = useDeleteWebhookMutation()
  const [testWebhook, { isLoading: isTesting }] = useTestWebhookMutation()

  const [createOpen, setCreateOpen] = useState(false)
  const [editWebhook, setEditWebhook] = useState<IWebhook | null>(null)
  const [newWebhookSecret, setNewWebhookSecret] = useState<CreateWebhookResponse | null>(null)
  const [deliveryLogWebhookId, setDeliveryLogWebhookId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null)

  const handleToggleActive = async (webhook: IWebhook) => {
    await updateWebhook({ id: webhook.id, data: { active: !webhook.active } })
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Delete webhook for "${url}"? This cannot be undone.`)) return
    await deleteWebhook(id)
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    const result = await testWebhook(id)
    if ('data' in result && result.data) {
      setTestResult({ id, success: result.data.success })
      setTimeout(() => setTestResult(null), 3000)
    }
    setTestingId(null)
  }

  const columns: GridColDef<IWebhook>[] = [
    {
      field: 'url',
      headerName: 'Endpoint URL',
      flex: 1.5,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Webhook fontSize="small" color="action" />
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
            noWrap
          >
            {params.row.url}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'events',
      headerName: 'Events',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {params.row.events.slice(0, 2).map((e) => (
            <Chip key={e} label={EVENT_LABELS[e] ?? e} size="small" />
          ))}
          {params.row.events.length > 2 && (
            <Chip label={`+${params.row.events.length - 2}`} size="small" variant="outlined" />
          )}
        </Box>
      ),
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 90,
      renderCell: (params) => (
        <Switch
          checked={params.row.active}
          onChange={() => handleToggleActive(params.row)}
          size="small"
        />
      ),
    },
    {
      field: 'failureCount',
      headerName: 'Failures',
      width: 90,
      renderCell: (params) => (
        <Chip
          label={params.row.failureCount}
          size="small"
          color={params.row.failureCount > 0 ? 'error' : 'default'}
          variant={params.row.failureCount > 0 ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'lastDeliveryAt',
      headerName: 'Last Delivery',
      width: 160,
      renderCell: (params) =>
        params.row.lastDeliveryAt
          ? format(new Date(params.row.lastDeliveryAt), 'dd MMM yyyy HH:mm')
          : 'Never',
    },
    {
      field: 'actions',
      headerName: '',
      width: 140,
      sortable: false,
      renderCell: (params) => {
        const isTestingThis = testingId === params.row.id
        const thisTestResult = testResult?.id === params.row.id ? testResult : null

        return (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={thisTestResult ? (thisTestResult.success ? 'Success!' : 'Failed') : 'Send test'}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleTest(params.row.id)}
                  disabled={isTestingThis || isTesting}
                  color={
                    thisTestResult
                      ? thisTestResult.success
                        ? 'success'
                        : 'error'
                      : 'default'
                  }
                >
                  {isTestingThis ? (
                    <CircularProgress size={16} />
                  ) : (
                    <PlayArrow fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delivery log">
              <IconButton
                size="small"
                onClick={() => setDeliveryLogWebhookId(params.row.id)}
              >
                <History fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setEditWebhook(params.row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(params.row.id, params.row.url)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      },
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6">Webhooks</Typography>
          <Typography variant="body2" color="text.secondary">
            Receive real-time notifications when CRM data changes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Add Webhook
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

      {/* Create dialog */}
      <WebhookFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(data) => {
          setCreateOpen(false)
          setNewWebhookSecret(data)
        }}
      />

      {/* Edit dialog */}
      {editWebhook && (
        <WebhookFormDialog
          open
          webhook={editWebhook}
          onClose={() => setEditWebhook(null)}
          onCreated={() => setEditWebhook(null)}
        />
      )}

      {/* Secret reveal dialog */}
      {newWebhookSecret && (
        <WebhookSecretDialog
          open
          data={newWebhookSecret}
          onClose={() => setNewWebhookSecret(null)}
        />
      )}

      {/* Delivery log drawer */}
      {deliveryLogWebhookId && (
        <Box sx={{ mt: 2 }}>
          <Box className="flex items-center justify-between mb-2">
            <Typography variant="subtitle2">Delivery Log</Typography>
            <Button size="small" onClick={() => setDeliveryLogWebhookId(null)}>Close</Button>
          </Box>
          <WebhookDeliveryLog webhookId={deliveryLogWebhookId} />
        </Box>
      )}
    </Box>
  )
}
