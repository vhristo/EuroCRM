'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  TablePagination,
  CircularProgress,
  Box,
} from '@mui/material'
import { useState } from 'react'
import { useGetWebhookDeliveriesQuery } from '@/store/api/webhooksApi'
import { formatDateTime } from '@/utils/formatters'

interface WebhookDeliveryLogProps {
  webhookId: string
}

export default function WebhookDeliveryLog({ webhookId }: WebhookDeliveryLogProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  const { data, isLoading } = useGetWebhookDeliveriesQuery({
    webhookId,
    page: page + 1,
    limit: rowsPerPage,
  })

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    )
  }

  const deliveries = data?.items ?? []
  const total = data?.total ?? 0

  if (deliveries.length === 0) {
    return (
      <Typography color="text.secondary" className="py-4 text-center">
        No deliveries yet.
      </Typography>
    )
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>HTTP Code</TableCell>
              <TableCell>Error</TableCell>
              <TableCell>Delivered At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Chip label={d.event} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={d.success ? 'Success' : 'Failed'}
                    size="small"
                    color={d.success ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{d.responseStatus ?? '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {d.error ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>{formatDateTime(d.deliveredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Paper>
  )
}
