'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CodeIcon from '@mui/icons-material/Code'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useRouter } from 'next/navigation'
import { useGetWebFormsQuery, useDeleteWebFormMutation } from '@/store/api/webFormsApi'
import type { IWebForm } from '@/types/webForm'
import EmbedCodeDialog from '@/components/web-forms/EmbedCodeDialog'
import { formatDate } from '@/utils/formatters'

export default function WebFormsPage() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [embedDialogForm, setEmbedDialogForm] = useState<IWebForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IWebForm | null>(null)

  const { data, isLoading } = useGetWebFormsQuery({ page: page + 1, limit: pageSize })
  const [deleteWebForm, { isLoading: isDeleting }] = useDeleteWebFormMutation()

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteWebForm(deleteTarget.id)
    setDeleteTarget(null)
  }

  const columns: GridColDef<IWebForm>[] = [
    {
      field: 'name',
      headerName: 'Form Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'slug',
      headerName: 'Slug / URL',
      flex: 1,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams<IWebForm, string>) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams<IWebForm, boolean>) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'submissions',
      headerName: 'Submissions',
      width: 120,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'fields',
      headerName: 'Fields',
      width: 80,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value: unknown, row: IWebForm) => row.fields?.length ?? 0,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 130,
      valueFormatter: (value: string) => formatDate(value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams<IWebForm>) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => router.push(`/web-forms/${params.row.id}`)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Embed Code">
            <IconButton
              size="small"
              onClick={() => setEmbedDialogForm(params.row)}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Preview (JSON)">
            <IconButton
              size="small"
              component="a"
              href={`/api/public/forms/${params.row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteTarget(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <Box className="flex flex-col gap-4 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Web Forms
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Capture leads directly from your website
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/web-forms/new')}
        >
          New Form
        </Button>
      </div>

      <Box sx={{ flex: 1, minHeight: 400 }}>
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
          sx={{ border: 0 }}
        />
      </Box>

      {/* Embed Code Dialog */}
      {embedDialogForm && (
        <EmbedCodeDialog
          open
          onClose={() => setEmbedDialogForm(null)}
          webFormId={embedDialogForm.id}
          webFormName={embedDialogForm.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Web Form</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be
            undone. Embedded forms will stop working immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
