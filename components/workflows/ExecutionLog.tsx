'use client'

import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useGetWorkflowExecutionsQuery } from '@/store/api/workflowsApi'
import type { IWorkflowExecution } from '@/types/workflow'
import { format } from 'date-fns'

interface ExecutionLogProps {
  workflowId: string
}

const PAGE_SIZE = 20

function StatusChip({ status }: { status: IWorkflowExecution['status'] }) {
  if (status === 'success') {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Success"
        color="success"
        size="small"
      />
    )
  }
  if (status === 'failure') {
    return (
      <Chip
        icon={<CancelIcon />}
        label="Failure"
        color="error"
        size="small"
      />
    )
  }
  return (
    <Chip
      icon={<WarningAmberIcon />}
      label="Partial"
      color="warning"
      size="small"
    />
  )
}

function ExecutionRow({ execution }: { execution: IWorkflowExecution }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <TableRow hover>
        <TableCell>
          <StatusChip status={execution.status} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {execution.trigger}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{execution.entityType}</Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary' }}
          >
            {execution.entityId.slice(0, 12)}...
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {format(new Date(execution.executedAt), 'dd MMM yyyy HH:mm')}
          </Typography>
        </TableCell>
        <TableCell>
          <Tooltip title={expanded ? 'Collapse' : 'View results'}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={expanded} unmountOnExit>
            <Box sx={{ py: 1, px: 2 }}>
              <List dense disablePadding>
                {execution.results.map((result, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemText
                      primary={
                        <Box className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircleIcon fontSize="small" color="success" />
                          ) : (
                            <CancelIcon fontSize="small" color="error" />
                          )}
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {result.action}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        result.error ? (
                          <Typography variant="caption" color="error">
                            {result.error}
                          </Typography>
                        ) : undefined
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function ExecutionLog({ workflowId }: ExecutionLogProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useGetWorkflowExecutionsQuery({
    id: workflowId,
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = useMemo(
    () => (data ? Math.ceil(data.total / PAGE_SIZE) : 0),
    [data]
  )

  if (isLoading) {
    return (
      <Box className="flex justify-center py-8">
        <CircularProgress />
      </Box>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <Box className="py-8 text-center">
        <Typography color="text.secondary">No executions recorded yet.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box className="flex items-center justify-between mb-2">
        <Typography variant="subtitle2" color="text.secondary">
          {data.total} total execution{data.total !== 1 ? 's' : ''}
        </Typography>
        {isFetching && <CircularProgress size={16} />}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell>Entity Type</TableCell>
              <TableCell>Entity ID</TableCell>
              <TableCell>Executed At</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((execution) => (
              <ExecutionRow key={execution.id} execution={execution} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box className="flex justify-center mt-4">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  )
}
