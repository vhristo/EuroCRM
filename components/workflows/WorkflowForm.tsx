'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import { CreateWorkflowSchema, type CreateWorkflowInput } from '@/lib/validators/workflowSchema'
import type { IWorkflow } from '@/types/workflow'
import TriggerSelector from './TriggerSelector'
import ConditionBuilder from './ConditionBuilder'
import ActionBuilder from './ActionBuilder'

interface WorkflowFormProps {
  initialData?: IWorkflow
  onSubmit: (data: CreateWorkflowInput) => Promise<void>
  isLoading: boolean
  error?: string
}

const DEFAULT_VALUES: CreateWorkflowInput = {
  name: '',
  description: '',
  trigger: 'deal_created',
  conditions: [],
  actions: [],
  active: true,
}

export default function WorkflowForm({
  initialData,
  onSubmit,
  isLoading,
  error,
}: WorkflowFormProps) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateWorkflowInput>({
    resolver: zodResolver(CreateWorkflowSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Populate form when editing existing workflow
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description ?? '',
        trigger: initialData.trigger,
        conditions: initialData.conditions,
        actions: initialData.actions,
        active: initialData.active,
      })
    }
  }, [initialData, reset])

  const conditions = watch('conditions')
  const actions = watch('actions')
  const trigger = watch('trigger')

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* Basic Info */}
      <Box className="flex flex-col gap-3">
        <TextField
          label="Workflow Name"
          fullWidth
          required
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register('name')}
        />

        <TextField
          label="Description (optional)"
          fullWidth
          multiline
          rows={2}
          error={!!errors.description}
          helperText={errors.description?.message}
          {...register('description')}
        />

        <Controller
          name="trigger"
          control={control}
          render={({ field }) => (
            <TriggerSelector
              value={field.value}
              onChange={field.onChange}
              error={!!errors.trigger}
            />
          )}
        />

        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label="Active"
            />
          )}
        />
      </Box>

      <Divider />

      {/* Conditions */}
      <ConditionBuilder
        conditions={conditions}
        onChange={(updated) => setValue('conditions', updated, { shouldValidate: true })}
      />

      {errors.conditions && (
        <Typography variant="caption" color="error">
          {typeof errors.conditions === 'object' && 'message' in errors.conditions
            ? String(errors.conditions.message)
            : 'Invalid conditions'}
        </Typography>
      )}

      <Divider />

      {/* Actions */}
      <ActionBuilder
        actions={actions}
        onChange={(updated) => setValue('actions', updated, { shouldValidate: true })}
      />

      {errors.actions && (
        <Typography variant="caption" color="error">
          {typeof errors.actions === 'object' && 'message' in errors.actions
            ? String(errors.actions.message)
            : 'At least one action is required'}
        </Typography>
      )}

      {/* Current trigger reminder */}
      {trigger && (
        <Typography variant="caption" color="text.secondary">
          This workflow fires on: <strong>{trigger.replace(/_/g, ' ')}</strong>
        </Typography>
      )}

      <Box className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {initialData ? 'Update Workflow' : 'Create Workflow'}
        </Button>
      </Box>
    </Box>
  )
}
