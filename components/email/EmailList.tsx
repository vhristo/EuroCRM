'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Typography,
  SelectChangeEvent,
} from '@mui/material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { Search as SearchIcon, Send as SendIcon } from '@mui/icons-material'
import { useListEmailMessagesQuery } from '@/store/api/emailApi'
import type { IEmailMessage } from '@/types/email'
import { format } from 'date-fns'
import ComposeEmail from './ComposeEmail'

const STATUS_COLORS: Record<IEmailMessage['status'], 'default' | 'success' | 'error' | 'warning'> = {
  queued: 'warning',
  sent: 'success',
  failed: 'error',
}

export default function EmailList() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'queued' | 'sent' | 'failed'>('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Simple debounce via timeout ref pattern — avoid extra dep
  const handleSearchChange = (value: string) => {
    setSearch(value)
    const timeout = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(0)
    }, 300)
    return () => clearTimeout(timeout)
  }

  const { data, isLoading } = useListEmailMessagesQuery({
    page: page + 1,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter,
  })

  const columns: GridColDef<IEmailMessage>[] = [
    {
      field: 'to',
      headerName: 'To',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params: GridRenderCellParams<IEmailMessage, string>) => (
        <Chip
          label={params.value ?? ''}
          color={STATUS_COLORS[params.value as IEmailMessage['status']] ?? 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'opens',
      headerName: 'Opens',
      width: 80,
      type: 'number',
      valueGetter: (value: IEmailMessage['opens']) => value?.length ?? 0,
    },
    {
      field: 'clicks',
      headerName: 'Clicks',
      width: 80,
      type: 'number',
      valueGetter: (value: IEmailMessage['clicks']) => value?.length ?? 0,
    },
    {
      field: 'sentAt',
      headerName: 'Sent At',
      width: 170,
      renderCell: (params: GridRenderCellParams<IEmailMessage, string>) =>
        params.value ? (
          <Typography variant="body2">
            {format(new Date(params.value), 'dd MMM yyyy HH:mm')}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 170,
      renderCell: (params: GridRenderCellParams<IEmailMessage, string>) => (
        <Typography variant="body2">
          {params.value ? format(new Date(params.value), 'dd MMM yyyy HH:mm') : '—'}
        </Typography>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search by recipient or subject…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e: SelectChangeEvent) => {
              setStatusFilter(e.target.value as '' | 'queued' | 'sent' | 'failed')
              setPage(0)
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="queued">Queued</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>

        <Box flex={1} />

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setComposeOpen(true)}
        >
          Compose Email
        </Button>
      </Stack>

      {/* Data Grid */}
      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          rowCount={data?.total ?? 0}
          loading={isLoading}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page)
            setPageSize(model.pageSize)
          }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          sx={{ border: 'none' }}
        />
      </Box>

      <ComposeEmail open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}
