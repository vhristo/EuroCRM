'use client'

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material'
import type { WorkflowTrigger } from '@/types/workflow'

const TRIGGER_OPTIONS: { value: WorkflowTrigger; label: string }[] = [
  { value: 'deal_created', label: 'Deal Created' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed' },
  { value: 'deal_won', label: 'Deal Won' },
  { value: 'deal_lost', label: 'Deal Lost' },
  { value: 'contact_created', label: 'Contact Created' },
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'lead_converted', label: 'Lead Converted' },
  { value: 'activity_completed', label: 'Activity Completed' },
  { value: 'form_submitted', label: 'Form Submitted' },
]

interface TriggerSelectorProps {
  value: WorkflowTrigger | ''
  onChange: (value: WorkflowTrigger) => void
  error?: boolean
  helperText?: string
  disabled?: boolean
}

export default function TriggerSelector({
  value,
  onChange,
  error,
  disabled,
}: TriggerSelectorProps) {
  const handleChange = (e: SelectChangeEvent<string>) => {
    onChange(e.target.value as WorkflowTrigger)
  }

  return (
    <FormControl fullWidth error={error} disabled={disabled}>
      <InputLabel id="trigger-selector-label">Trigger Event</InputLabel>
      <Select
        labelId="trigger-selector-label"
        value={value}
        label="Trigger Event"
        onChange={handleChange}
      >
        {TRIGGER_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export { TRIGGER_OPTIONS }
