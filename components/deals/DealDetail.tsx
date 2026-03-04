'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import type { IDeal } from '@/types/deal'
import { useUpdateDealMutation, useDeleteDealMutation } from '@/store/api/dealsApi'
import { formatCurrency, formatDate } from '@/utils/formatters'
import DealForm from './DealForm'
import { useRouter } from 'next/navigation'

interface DealDetailProps {
  deal: IDeal
}

const STATUS_CONFIG: Record<string, { label: string; color: 'info' | 'success' | 'error' }> = {
  open: { label: 'Open', color: 'info' },
  won: { label: 'Won', color: 'success' },
  lost: { label: 'Lost', color: 'error' },
}

interface InfoRowProps {
  label: string
  value: string | undefined | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value ?? '—'}
      </Typography>
    </Box>
  )
}

export default function DealDetail({ deal }: DealDetailProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [updateDeal, { isLoading: updating }] = useUpdateDealMutation()
  const [deleteDeal, { isLoading: deleting }] = useDeleteDealMutation()

  const status = STATUS_CONFIG[deal.status] ?? STATUS_CONFIG.open

  const handleMarkWon = async () => {
    await updateDeal({ id: deal.id, data: { status: 'won' } })
  }

  const handleMarkLost = async () => {
    await updateDeal({ id: deal.id, data: { status: 'lost' } })
  }

  const handleDelete = async () => {
    await deleteDeal(deal.id)
    setDeleteOpen(false)
    router.push('/deals')
  }

  return (
    <Box>
      {/* Header card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            display="flex"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            flexDirection={{ xs: 'column', sm: 'row' }}
            gap={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {deal.title}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Chip label={status.label} color={status.color} size="small" />
                <Typography variant="h6" color="primary.main" fontWeight={700}>
                  {formatCurrency(deal.value, deal.currency)}
                </Typography>
                <Chip label={`${deal.probability}% probability`} size="small" variant="outlined" />
              </Box>
            </Box>

            {/* Actions */}
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
              {deal.status !== 'won' && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleMarkWon}
                  disabled={updating}
                >
                  Mark Won
                </Button>
              )}
              {deal.status !== 'lost' && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={handleMarkLost}
                  disabled={updating}
                >
                  Mark Lost
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Details card */}
      <Card>
        <CardHeader title="Deal Details" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Stage" value={deal.stage} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Currency" value={deal.currency} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Expected Close"
                value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : undefined}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Stage Entered"
                value={deal.stageEnteredAt ? formatDate(deal.stageEnteredAt) : undefined}
              />
            </Grid>
            {deal.wonAt && (
              <Grid item xs={12} sm={6}>
                <InfoRow label="Won At" value={formatDate(deal.wonAt)} />
              </Grid>
            )}
            {deal.lostAt && (
              <Grid item xs={12} sm={6}>
                <InfoRow label="Lost At" value={formatDate(deal.lostAt)} />
              </Grid>
            )}
            {deal.rottenSince && (
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Rotten Since
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="error.main">
                    {formatDate(deal.rottenSince)}
                  </Typography>
                </Box>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <InfoRow
                label="Created"
                value={deal.createdAt ? formatDate(deal.createdAt) : undefined}
              />
            </Grid>
            {deal.notes && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {deal.notes}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Deal</DialogTitle>
        <DialogContent>
          <DealForm
            deal={deal}
            pipelineId={deal.pipelineId}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Deal?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete <strong>{deal.title}</strong>? This cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
