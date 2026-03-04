'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import { Delete, Edit } from '@mui/icons-material'
import {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridRowParams,
} from '@mui/x-data-grid'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useGetContactsQuery,
  useDeleteContactMutation,
} from '@/store/api/contactsApi'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatters'
import type { IContact } from '@/types/contact'

export function ContactTable() {
  const router = useRouter()

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  })
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<IContact | null>(null)

  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading, isFetching } = useGetContactsQuery({
    page: paginationModel.page + 1, // MUI DataGrid is 0-based; API is 1-based
    limit: paginationModel.pageSize,
    search: debouncedSearch || undefined,
  })

  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation()

  const handleRowClick = useCallback(
    (params: GridRowParams) => {
      router.push(`/contacts/${String(params.id)}`)
    },
    [router]
  )

  const handleEditClick = useCallback(
    (e: React.MouseEvent, contact: IContact) => {
      e.stopPropagation()
      router.push(`/contacts/${contact.id}`)
    },
    [router]
  )

  const handleDeleteClick = useCallback((e: React.MouseEvent, contact: IContact) => {
    e.stopPropagation()
    setDeleteTarget(contact)
  }, [])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteContact(deleteTarget.id).unwrap()
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    // Reset to first page when search changes
    setPaginationModel((prev) => ({ ...prev, page: 0 }))
  }, [])

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_value: unknown, row: IContact) =>
        `${row.firstName} ${row.lastName}`,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 180,
    },
    {
      field: 'company',
      headerName: 'Company',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 1,
      minWidth: 130,
    },
    {
      field: 'country',
      headerName: 'Country',
      width: 120,
    },
    {
      field: 'tags',
      headerName: 'Tags',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (params: GridRenderCellParams<IContact, string[]>) => (
        <Box
          display="flex"
          gap={0.5}
          flexWrap="wrap"
          alignItems="center"
          height="100%"
        >
          {(params.value ?? []).slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          {(params.value ?? []).length > 3 && (
            <Chip
              label={`+${(params.value ?? []).length - 3}`}
              size="small"
              variant="outlined"
              color="default"
            />
          )}
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      valueFormatter: (value: string) => (value ? formatDate(value) : ''),
    },
    {
      field: 'actions',
      headerName: '',
      width: 96,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<IContact>) => (
        <Box display="flex" gap={0.5}>
          <Tooltip title="View / edit contact">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => handleEditClick(e, params.row)}
              aria-label="edit contact"
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete contact">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => handleDeleteClick(e, params.row)}
              aria-label="delete contact"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  // Ensure each row has a stable `id` field for MUI DataGrid
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
        onRowClick={handleRowClick}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name, email, or company..."
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Contact"
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.firstName} ${deleteTarget.lastName}? This action cannot be undone.`
            : ''
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  )
}
