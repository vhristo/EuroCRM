'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import HistoryIcon from '@mui/icons-material/History'
import { format } from 'date-fns'
import {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useToggleWorkflowMutation,
} from '@/store/api/workflowsApi'
import type { IWorkflow } from '@/types/workflow'
import type { CreateWorkflowInput } from '@/lib/validators/workflowSchema'
import WorkflowForm from './WorkflowForm'
import ExecutionLog from './ExecutionLog'
import { TRIGGER_OPTIONS } from './TriggerSelector'
import Link from 'next/link'

const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(
  TRIGGER_OPTIONS.map((o) => [o.value, o.label])
)

export default function WorkflowList() {
  const [createOpen, setCreateOpen] = useState(false)
  const [executionWorkflowId, setExecutionWorkflowId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | undefined>()

  const { data, isLoading, isError } = useGetWorkflowsQuery({})
  const [createWorkflow, { isLoading: isCreating }] = useCreateWorkflowMutation()
  const [deleteWorkflow] = useDeleteWorkflowMutation()
  const [toggleWorkflow] = useToggleWorkflowMutation()

  const handleCreate = async (input: CreateWorkflowInput) => {
    setFormError(undefined)
    try {
      await createWorkflow(input).unwrap()
      setCreateOpen(false)
    } catch {
      setFormError('Failed to create workflow. Please try again.')
    }
  }

  const handleDelete = async (workflow: IWorkflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) return
    try {
      await deleteWorkflow(workflow.id).unwrap()
    } catch {
      // silent — list will still show
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleWorkflow(id).unwrap()
    } catch {
      // silent
    }
  }

  if (isLoading) {
    return (
      <Box className="flex justify-center py-12">
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">Failed to load workflows. Please refresh.</Alert>
  }

  const workflows = data?.items ?? []

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Typography variant="h6">
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New Workflow
        </Button>
      </Box>

      {workflows.length === 0 ? (
        <Paper variant="outlined" className="p-8 text-center">
          <Typography color="text.secondary">
            No workflows yet. Create one to automate your CRM actions.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Executions</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id} hover>
                  <TableCell>
                    <Link
                      href={`/workflows/${workflow.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{ '&:hover': { textDecoration: 'underline', cursor: 'pointer' } }}
                      >
                        {workflow.name}
                      </Typography>
                    </Link>
                    {workflow.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {workflow.description}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={TRIGGER_LABEL[workflow.trigger] ?? workflow.trigger}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{workflow.executionCount}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {workflow.lastExecutedAt
                        ? format(new Date(workflow.lastExecutedAt), 'dd MMM HH:mm')
                        : '—'}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Switch
                      checked={workflow.active}
                      onChange={() => handleToggle(workflow.id)}
                      size="small"
                      color="success"
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Execution log">
                      <IconButton
                        size="small"
                        onClick={() => setExecutionWorkflowId(workflow.id)}
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        component={Link}
                        href={`/workflows/${workflow.id}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(workflow)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>New Workflow</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <WorkflowForm
            onSubmit={handleCreate}
            isLoading={isCreating}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      {/* Execution log dialog */}
      <Dialog
        open={!!executionWorkflowId}
        onClose={() => setExecutionWorkflowId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execution Log</DialogTitle>
        <DialogContent>
          {executionWorkflowId && (
            <ExecutionLog workflowId={executionWorkflowId} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
