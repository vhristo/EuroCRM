'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Delete,
  Edit,
  Send,
  Pause,
  Visibility,
} from '@mui/icons-material'
import {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
} from '@mui/x-data-grid'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useGetCampaignsQuery,
  useDeleteCampaignMutation,
  useSendCampaignMutation,
  usePauseCampaignMutation,
} from '@/store/api/campaignsApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import { formatDate } from '@/utils/formatters'
import type { ICampaign } from '@/types/campaign'

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

export function CampaignList() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  })
  const [deleteTarget, setDeleteTarget] = useState<ICampaign | null>(null)

  const { data, isLoading, isFetching } = useGetCampaignsQuery({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  })

  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteCampaignMutation()
  const [sendCampaign] = useSendCampaignMutation()
  const [pauseCampaign] = usePauseCampaignMutation()

  const handleView = useCallback(
    (e: React.MouseEvent, campaign: ICampaign) => {
      e.stopPropagation()
      router.push(`/campaigns/${campaign.id}`)
    },
    [router]
  )

  const handleSend = useCallback(
    async (e: React.MouseEvent, campaign: ICampaign) => {
      e.stopPropagation()
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
    },
    [sendCampaign, dispatch]
  )

  const handlePause = useCallback(
    async (e: React.MouseEvent, campaign: ICampaign) => {
      e.stopPropagation()
      try {
        await pauseCampaign(campaign.id).unwrap()
        dispatch(addNotification({ type: 'success', message: 'Campaign paused' }))
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to pause campaign' }))
      }
    },
    [pauseCampaign, dispatch]
  )

  const handleDeleteClick = useCallback((e: React.MouseEvent, campaign: ICampaign) => {
    e.stopPropagation()
    setDeleteTarget(campaign)
  }, [])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCampaign(deleteTarget.id).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Campaign deleted' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete campaign' }))
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Campaign',
      flex: 1.5,
      minWidth: 180,
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params: GridRenderCellParams<ICampaign, string>) => (
        <Chip
          label={params.value}
          size="small"
          color={STATUS_COLOR[params.value as ICampaign['status']] ?? 'default'}
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'stats.totalRecipients',
      headerName: 'Recipients',
      width: 110,
      valueGetter: (_value: unknown, row: ICampaign) => row.stats.totalRecipients,
    },
    {
      field: 'stats.sent',
      headerName: 'Sent',
      width: 80,
      valueGetter: (_value: unknown, row: ICampaign) => row.stats.sent,
    },
    {
      field: 'stats.opened',
      headerName: 'Opened',
      width: 90,
      valueGetter: (_value: unknown, row: ICampaign) =>
        row.stats.totalRecipients > 0
          ? `${((row.stats.opened / row.stats.totalRecipients) * 100).toFixed(1)}%`
          : '—',
    },
    {
      field: 'stats.clicked',
      headerName: 'Clicked',
      width: 90,
      valueGetter: (_value: unknown, row: ICampaign) =>
        row.stats.totalRecipients > 0
          ? `${((row.stats.clicked / row.stats.totalRecipients) * 100).toFixed(1)}%`
          : '—',
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      valueFormatter: (value: string) => (value ? formatDate(value) : ''),
    },
    {
      field: 'actions',
      headerName: '',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<ICampaign>) => {
        const { row } = params
        return (
          <Box display="flex" gap={0.5} alignItems="center">
            <Tooltip title="View details">
              <IconButton
                size="small"
                onClick={(e) => handleView(e, row)}
                aria-label="view campaign"
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>

            {['draft', 'paused'].includes(row.status) && (
              <Tooltip title={row.status === 'paused' ? 'Resume sending' : 'Start sending'}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => handleSend(e, row)}
                  aria-label="send campaign"
                >
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {row.status === 'sending' && (
              <Tooltip title="Pause sending">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={(e) => handlePause(e, row)}
                  aria-label="pause campaign"
                >
                  <Pause fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {['draft', 'paused'].includes(row.status) && (
              <Tooltip title="Edit campaign">
                <IconButton
                  size="small"
                  onClick={(e) => handleView(e, row)}
                  aria-label="edit campaign"
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {row.status !== 'sending' && (
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => handleDeleteClick(e, row)}
                  aria-label="delete campaign"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )
      },
    },
  ]

  const rows = (data?.items ?? []).map((c) => ({ ...c, id: c.id }))

  return (
    <Box>
      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={data?.total ?? 0}
        onRowClick={(params) => router.push(`/campaigns/${String(params.id)}`)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Campaign"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
