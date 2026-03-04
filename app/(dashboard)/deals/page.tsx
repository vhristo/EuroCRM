'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material'
import type { GridColDef, GridPaginationModel, GridRowParams } from '@mui/x-data-grid'
import PageHeader from '@/components/layout/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useGetDealsQuery } from '@/store/api/dealsApi'
import { formatCurrency, formatDate } from '@/utils/formatters'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
] as const

type StatusFilter = '' | 'open' | 'won' | 'lost'

const STATUS_COLORS: Record<string, 'default' | 'info' | 'success' | 'error'> = {
  open: 'info',
  won: 'success',
  lost: 'error',
}

const columns: GridColDef[] = [
  {
    field: 'title',
    headerName: 'Title',
    flex: 2,
    minWidth: 180,
  },
  {
    field: 'value',
    headerName: 'Value',
    flex: 1,
    minWidth: 120,
    renderCell: (params) => formatCurrency(params.row.value as number, params.row.currency as string),
  },
  {
    field: 'stage',
    headerName: 'Stage',
    flex: 1,
    minWidth: 140,
  },
  {
    field: 'status',
    headerName: 'Status',
    flex: 1,
    minWidth: 100,
    renderCell: (params) => {
      const s = params.value as string
      return (
        <Chip
          label={s.charAt(0).toUpperCase() + s.slice(1)}
          color={STATUS_COLORS[s] ?? 'default'}
          size="small"
        />
      )
    },
  },
  {
    field: 'probability',
    headerName: 'Probability',
    flex: 0.7,
    minWidth: 100,
    renderCell: (params) => `${params.value as number}%`,
  },
  {
    field: 'expectedCloseDate',
    headerName: 'Expected Close',
    flex: 1,
    minWidth: 130,
    renderCell: (params) =>
      params.value ? formatDate(params.value as string) : '—',
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    flex: 1,
    minWidth: 120,
    renderCell: (params) =>
      params.value ? formatDate(params.value as string) : '—',
  },
]

export default function DealsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  })

  const { data, isLoading } = useGetDealsQuery({
    status: statusFilter || undefined,
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  })

  const rows = (data?.items ?? []).map((d) => ({ ...d, id: d.id }))

  const handleRowClick = (params: GridRowParams) => {
    router.push(`/deals/${params.id as string}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Deals" />

      {/* Status filter */}
      <Box>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_e, val: StatusFilter | null) => {
            if (val !== null) {
              setStatusFilter(val)
              setPaginationModel((prev) => ({ ...prev, page: 0 }))
            }
          }}
          size="small"
        >
          {STATUS_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={data?.total ?? 0}
        onRowClick={handleRowClick}
      />
    </div>
  )
}
