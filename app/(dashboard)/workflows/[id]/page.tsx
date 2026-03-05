'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import {
  useGetWorkflowQuery,
  useUpdateWorkflowMutation,
} from '@/store/api/workflowsApi'
import type { CreateWorkflowInput } from '@/lib/validators/workflowSchema'
import WorkflowForm from '@/components/workflows/WorkflowForm'
import ExecutionLog from '@/components/workflows/ExecutionLog'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function WorkflowDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [formError, setFormError] = useState<string | undefined>()

  const { data: workflow, isLoading, isError } = useGetWorkflowQuery(id)
  const [updateWorkflow, { isLoading: isUpdating }] = useUpdateWorkflowMutation()

  const handleUpdate = async (input: CreateWorkflowInput) => {
    setFormError(undefined)
    try {
      await updateWorkflow({ id, data: input }).unwrap()
      // Show brief feedback then stay on page
    } catch {
      setFormError('Failed to update workflow. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <Box className="flex justify-center py-12">
        <CircularProgress />
      </Box>
    )
  }

  if (isError || !workflow) {
    return (
      <Box className="p-6">
        <Alert severity="error">Workflow not found.</Alert>
        <Button
          component={Link}
          href="/workflows"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Automations
        </Button>
      </Box>
    )
  }

  return (
    <Box className="flex flex-col h-full">
      {/* Header */}
      <Box className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <Button
          component={Link}
          href="/workflows"
          startIcon={<ArrowBackIcon />}
          size="small"
          variant="text"
        >
          Automations
        </Button>
        <Typography variant="body2" color="text.secondary">/</Typography>
        <Typography variant="h6">{workflow.name}</Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 6 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Configuration" />
          <Tab label="Execution Log" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box className="flex-1 p-6 overflow-auto">
        {activeTab === 0 && (
          <Box sx={{ maxWidth: 800 }}>
            <WorkflowForm
              initialData={workflow}
              onSubmit={handleUpdate}
              isLoading={isUpdating}
              error={formError}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <ExecutionLog workflowId={id} />
        )}
      </Box>
    </Box>
  )
}
