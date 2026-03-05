'use client'

import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import type { IWorkflowCondition, WorkflowConditionOperator } from '@/types/workflow'

const OPERATOR_OPTIONS: { value: WorkflowConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_set', label: 'Is Set' },
  { value: 'is_not_set', label: 'Is Not Set' },
]

const NO_VALUE_OPERATORS: WorkflowConditionOperator[] = ['is_set', 'is_not_set']

const COMMON_FIELDS = [
  { value: 'stage', label: 'Stage' },
  { value: 'previousStage', label: 'Previous Stage' },
  { value: 'status', label: 'Status' },
  { value: 'value', label: 'Deal Value' },
  { value: 'source', label: 'Lead Source' },
  { value: 'type', label: 'Activity Type' },
  { value: 'ownerId', label: 'Owner ID' },
  { value: 'tags', label: 'Tags' },
]

interface ConditionBuilderProps {
  conditions: IWorkflowCondition[]
  onChange: (conditions: IWorkflowCondition[]) => void
}

export default function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const handleAdd = () => {
    onChange([
      ...conditions,
      { field: '', operator: 'equals', value: '' },
    ])
  }

  const handleRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  const handleFieldChange = (index: number, field: string) => {
    const updated = conditions.map((c, i) => (i === index ? { ...c, field } : c))
    onChange(updated)
  }

  const handleOperatorChange = (index: number, operator: WorkflowConditionOperator) => {
    const updated = conditions.map((c, i) => {
      if (i !== index) return c
      const next: IWorkflowCondition = { ...c, operator }
      if (NO_VALUE_OPERATORS.includes(operator)) {
        delete next.value
      }
      return next
    })
    onChange(updated)
  }

  const handleValueChange = (index: number, value: string) => {
    const updated = conditions.map((c, i) => (i === index ? { ...c, value } : c))
    onChange(updated)
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Conditions{' '}
        <Typography component="span" variant="caption" color="text.disabled">
          (all must match — leave empty to always run)
        </Typography>
      </Typography>

      <Box className="flex flex-col gap-2 mb-3">
        {conditions.map((condition, index) => (
          <Box key={index} className="flex gap-2 items-center">
            {/* Field */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Field</InputLabel>
              <Select
                value={condition.field}
                label="Field"
                onChange={(e: SelectChangeEvent) =>
                  handleFieldChange(index, e.target.value)
                }
              >
                {COMMON_FIELDS.map((f) => (
                  <MenuItem key={f.value} value={f.value}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Operator */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Operator</InputLabel>
              <Select
                value={condition.operator}
                label="Operator"
                onChange={(e: SelectChangeEvent) =>
                  handleOperatorChange(index, e.target.value as WorkflowConditionOperator)
                }
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <MenuItem key={op.value} value={op.value}>
                    {op.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Value (hidden for is_set / is_not_set) */}
            {!NO_VALUE_OPERATORS.includes(condition.operator) && (
              <TextField
                size="small"
                label="Value"
                value={condition.value ?? ''}
                onChange={(e) => handleValueChange(index, e.target.value)}
                sx={{ minWidth: 140, flex: 1 }}
              />
            )}

            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemove(index)}
              aria-label="Remove condition"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={handleAdd}
        variant="outlined"
      >
        Add Condition
      </Button>
    </Box>
  )
}
