'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import PauseIcon from '@mui/icons-material/Pause'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PreviewIcon from '@mui/icons-material/Visibility'
import EmailIcon from '@mui/icons-material/Email'
import {
  useGetCampaignQuery,
  useDeleteCampaignMutation,
  useSendCampaignMutation,
  usePauseCampaignMutation,
  usePreviewCampaignMutation,
  useTestCampaignMutation,
  useGetCampaignRecipientsQuery,
} from '@/store/api/campaignsApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import { formatDate } from '@/utils/formatters'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { CampaignStats } from '@/components/campaigns/CampaignStats'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  DataGrid,
} from '@mui/x-data-grid'
import type { ICampaign, ICampaignRecipient } from '@/types/campaign'

const STATUS_COLOR: Record<
  ICampaign['status'],
  'default' | 'primary' | 'warning' | 'success' | 'error'
> = {
  draft: 'default',
  scheduled: 'primary',
  sending: 'warning',
  sent: 'success',
  paused: 'error',
}

const RECIPIENT_STATUS_COLOR: Record<
  ICampaignRecipient['status'],
  'default' | 'primary' | 'success' | 'error' | 'info'
> = {
  pending: 'default',
  sent: 'primary',
  opened: 'success',
  clicked: 'info',
  failed: 'error',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const dispatch = useAppDispatch()

  const [activeTab, setActiveTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [recipientPagination, setRecipientPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  })

  const { data: campaign, isLoading } = useGetCampaignQuery(id)
  const { data: recipientsData, isLoading: recipientsLoading } = useGetCampaignRecipientsQuery(
    { id, page: recipientPagination.page + 1, limit: recipientPagination.pageSize },
    { skip: activeTab !== 2 }
  )

  const [sendCampaign, { isLoading: isSending }] = useSendCampaignMutation()
  const [pauseCampaign, { isLoading: isPausing }] = usePauseCampaignMutation()
  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteCampaignMutation()
  const [previewCampaign, { isLoading: isPreviewing, data: previewData }] =
    usePreviewCampaignMutation()
  const [testCampaign, { isLoading: isTesting }] = useTestCampaignMutation()

  const handleSend = async () => {
    if (!campaign) return
    try {
      const result = await sendCampaign(campaign.id).unwrap()
      dispatch(
        addNotification({
          type: 'success',
          message: `Campaign started — ${result.sent} sent, ${result.failed} failed`,
        })
      )
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to start campaign' }))
    }
  }

  const handlePause = async () => {
    if (!campaign) return
    try {
      await pauseCampaign(campaign.id).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Campaign paused' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to pause campaign' }))
    }
  }

  const handleDelete = async () => {
    if (!campaign) return
    try {
      await deleteCampaign(campaign.id).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Campaign deleted' }))
      router.push('/campaigns')
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete campaign' }))
    } finally {
      setDeleteOpen(false)
    }
  }

  const handlePreview = async () => {
    if (!campaign) return
    await previewCampaign(campaign.id)
    setPreviewOpen(true)
  }

  const handleTest = async () => {
    if (!campaign) return
    try {
      const result = await testCampaign(campaign.id).unwrap()
      dispatch(
        addNotification({
          type: 'success',
          message: `Test email sent to ${result.sentTo}`,
        })
      )
    } catch {
      dispatch(
        addNotification({ type: 'error', message: 'Failed to send test email' })
      )
    }
  }

  // Recipient columns
  const recipientColumns: GridColDef[] = [
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params: GridRenderCellParams<ICampaignRecipient, string>) => (
        <Chip
          label={params.value}
          size="small"
          color={RECIPIENT_STATUS_COLOR[params.value as ICampaignRecipient['status']] ?? 'default'}
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'sentAt',
      headerName: 'Sent',
      width: 140,
      valueFormatter: (value: string) => (value ? formatDate(value) : '—'),
    },
    {
      field: 'openedAt',
      headerName: 'Opened',
      width: 140,
      valueFormatter: (value: string) => (value ? formatDate(value) : '—'),
    },
    {
      field: 'clickedAt',
      headerName: 'Clicked',
      width: 140,
      valueFormatter: (value: string) => (value ? formatDate(value) : '—'),
    },
    {
      field: 'errorMessage',
      headerName: 'Error',
      flex: 1,
      minWidth: 180,
      valueFormatter: (value: string) => value ?? '',
    },
  ]

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }

  if (!campaign) {
    return (
      <Box p={6}>
        <Alert severity="error">Campaign not found.</Alert>
      </Box>
    )
  }

  const canEdit = ['draft', 'paused'].includes(campaign.status)
  const canSend = ['draft', 'paused'].includes(campaign.status)
  const canPause = campaign.status === 'sending'
  const canDelete = campaign.status !== 'sending'

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Back + title row */}
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/campaigns')}
          size="small"
          variant="text"
        >
          Campaigns
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {campaign.name}
        </Typography>
        <Chip
          label={campaign.status}
          color={STATUS_COLOR[campaign.status]}
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      </Box>

      {/* Action buttons */}
      <Box display="flex" gap={1} flexWrap="wrap">
        {canSend && (
          <Button
            variant="contained"
            startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? 'Starting...' : campaign.status === 'paused' ? 'Resume' : 'Send Campaign'}
          </Button>
        )}

        {canPause && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={isPausing ? <CircularProgress size={16} color="inherit" /> : <PauseIcon />}
            onClick={handlePause}
            disabled={isPausing}
          >
            {isPausing ? 'Pausing...' : 'Pause'}
          </Button>
        )}

        <Tooltip title="Preview with sample data">
          <Button
            variant="outlined"
            startIcon={
              isPreviewing ? <CircularProgress size={16} color="inherit" /> : <PreviewIcon />
            }
            onClick={handlePreview}
            disabled={isPreviewing}
          >
            Preview
          </Button>
        </Tooltip>

        <Tooltip title="Send test email to yourself">
          <Button
            variant="outlined"
            startIcon={
              isTesting ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />
            }
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? 'Sending...' : 'Test Email'}
          </Button>
        </Tooltip>

        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        )}
      </Box>

      {/* Campaign metadata */}
      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Subject
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {campaign.subject}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2">{formatDate(campaign.createdAt)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Tags Filter
              </Typography>
              <Typography variant="body2">
                {campaign.recipientFilter.tags?.length
                  ? campaign.recipientFilter.tags.join(', ')
                  : 'All'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Country Filter
              </Typography>
              <Typography variant="body2">
                {campaign.recipientFilter.country || 'All'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs: Stats / Template / Recipients */}
      <Card variant="outlined">
        <CardHeader
          sx={{ pb: 0 }}
          title={
            <Tabs
              value={activeTab}
              onChange={(_e, v: number) => setActiveTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Stats" />
              <Tab label="Template" />
              <Tab label="Recipients" />
            </Tabs>
          }
        />
        <CardContent>
          {/* Stats tab */}
          {activeTab === 0 && <CampaignStats stats={campaign.stats} />}

          {/* Template tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                HTML Body
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 400,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {campaign.htmlBody}
              </Box>

              {campaign.textBody && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Plain Text Body
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      overflowX: 'auto',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 200,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {campaign.textBody}
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Recipients tab */}
          {activeTab === 2 && (
            <Box>
              <DataGrid
                rows={(recipientsData?.items ?? []).map((r) => ({ ...r, id: r.id }))}
                columns={recipientColumns}
                loading={recipientsLoading}
                paginationModel={recipientPagination}
                onPaginationModelChange={setRecipientPagination}
                rowCount={recipientsData?.total ?? 0}
                paginationMode="server"
                pageSizeOptions={[10, 20, 50]}
                disableRowSelectionOnClick
                autoHeight
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'grey.50',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { p: 1 } }}
      >
        <DialogContent>
          <CampaignForm
            campaign={campaign}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${campaign.name}"? This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Preview dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <CardHeader
          title="Campaign Preview"
          subheader={
            previewData
              ? `Rendered for: ${previewData.sampleContact.firstName ?? ''} ${previewData.sampleContact.lastName ?? ''} <${previewData.sampleContact.email ?? ''}>`
              : ''
          }
          sx={{ pb: 0 }}
        />
        <CardContent>
          {previewData ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Subject
              </Typography>
              <Typography variant="body1" fontWeight={600} mb={2}>
                {previewData.subject}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box
                dangerouslySetInnerHTML={{ __html: previewData.htmlBody }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  minHeight: 200,
                  bgcolor: 'background.paper',
                }}
              />
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}
        </CardContent>
      </Dialog>
    </div>
  )
}
