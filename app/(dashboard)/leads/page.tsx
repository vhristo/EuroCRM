'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Typography,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import {
  Delete as DeleteIcon,
  SwapHoriz as ConvertIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateLeadSchema } from '@/lib/validators/leadSchema'
import {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useConvertLeadMutation,
} from '@/store/api/leadsApi'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import PageHeader from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusChip } from '@/components/shared/StatusChip'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatters'
import { LEAD_SOURCES } from '@/utils/constants'
import type { z } from 'zod'

type CreateLeadInput = z.infer<typeof CreateLeadSchema>

export default function LeadsPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [convertId, setConvertId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useGetLeadsQuery({
    page: page + 1,
    limit: 20,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  })
  const [createLead] = useCreateLeadMutation()
  const [deleteLead] = useDeleteLeadMutation()
  const [convertLead] = useConvertLeadMutation()
  const { data: pipelines } = useGetPipelinesQuery()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', source: 'other', notes: '' },
  })

  const [convertForm, setConvertForm] = useState({
    dealTitle: '',
    dealValue: '',
    pipelineId: '',
    stage: '',
  })

  const pipeline = pipelines?.[0]

  const onCreateSubmit = async (values: CreateLeadInput) => {
    await createLead(values)
    setCreateOpen(false)
    reset()
  }

  const onConvert = async () => {
    if (!convertId || !convertForm.pipelineId || !convertForm.stage) return
    await convertLead({
      id: convertId,
      data: {
        dealTitle: convertForm.dealTitle,
        dealValue: Math.round(parseFloat(convertForm.dealValue || '0') * 100),
        currency: 'EUR',
        pipelineId: convertForm.pipelineId,
        stage: convertForm.stage,
      },
    })
    setConvertId(null)
    setConvertForm({ dealTitle: '', dealValue: '', pipelineId: '', stage: '' })
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.5 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'company', headerName: 'Company', flex: 1 },
    { field: 'source', headerName: 'Source', flex: 0.8, renderCell: (params) => (
      <Chip label={params.value} size="small" variant="outlined" />
    )},
    { field: 'status', headerName: 'Status', flex: 0.8, renderCell: (params) => (
      <StatusChip status={params.value} />
    )},
    { field: 'createdAt', headerName: 'Created', flex: 1, valueFormatter: (value: string) => formatDate(value) },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      renderCell: (params) => (
        <div className="flex gap-1">
          {params.row.status !== 'converted' && (
            <IconButton
              size="small"
              color="primary"
              title="Convert to Deal"
              onClick={(e) => {
                e.stopPropagation()
                setConvertId(params.row.id ?? params.row._id)
                if (pipeline) {
                  setConvertForm((f) => ({
                    ...f,
                    dealTitle: `Deal - ${params.row.name}`,
                    pipelineId: pipeline.id,
                    stage: pipeline.stages?.[0]?.name ?? '',
                  }))
                }
              }}
            >
              <ConvertIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteId(params.row.id ?? params.row._id)
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader title="Leads" actionLabel="Add Lead" onAction={() => setCreateOpen(true)} />

      <Card className="mt-4">
        <CardContent>
          <div className="flex gap-4 mb-4">
            <TextField
              size="small"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              sx={{ width: 300 }}
            />
            <FormControl size="small" sx={{ width: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="contacted">Contacted</MenuItem>
                <MenuItem value="qualified">Qualified</MenuItem>
                <MenuItem value="unqualified">Unqualified</MenuItem>
                <MenuItem value="converted">Converted</MenuItem>
              </Select>
            </FormControl>
          </div>

          <DataGrid
            rows={data?.items ?? []}
            columns={columns}
            loading={isLoading}
            rowCount={data?.total ?? 0}
            paginationMode="server"
            paginationModel={{ page, pageSize: 20 }}
            onPaginationModelChange={(model) => setPage(model.page)}
            pageSizeOptions={[20]}
            getRowId={(row) => row.id ?? row._id}
            autoHeight
            disableRowSelectionOnClick
            sx={{ border: 'none' }}
          />
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} className="mt-1">
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Email" fullWidth error={!!errors.email} helperText={errors.email?.message} />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Phone" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="company"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Company" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="source"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Source" fullWidth select>
                      {LEAD_SOURCES.map((s) => (
                        <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Notes" fullWidth multiline rows={3} />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create Lead
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog open={Boolean(convertId)} onClose={() => setConvertId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Convert Lead to Contact + Deal</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 mt-2">
            <TextField
              label="Deal Title"
              fullWidth
              value={convertForm.dealTitle}
              onChange={(e) => setConvertForm((f) => ({ ...f, dealTitle: e.target.value }))}
            />
            <TextField
              label="Deal Value (EUR)"
              fullWidth
              type="number"
              value={convertForm.dealValue}
              onChange={(e) => setConvertForm((f) => ({ ...f, dealValue: e.target.value }))}
            />
            {pipeline && (
              <TextField
                label="Stage"
                fullWidth
                select
                value={convertForm.stage}
                onChange={(e) => setConvertForm((f) => ({ ...f, stage: e.target.value }))}
              >
                {pipeline.stages?.map((s: { name: string }) => (
                  <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>
                ))}
              </TextField>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertId(null)}>Cancel</Button>
          <Button variant="contained" onClick={onConvert}>Convert</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Lead"
        message="Are you sure you want to delete this lead?"
        onConfirm={async () => {
          if (deleteId) await deleteLead(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
