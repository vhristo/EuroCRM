'use client'

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import type { IPipeline } from '@/types/pipeline'

interface PipelineSelectorProps {
  pipelines: IPipeline[]
  selectedId: string
  onChange: (id: string) => void
}

export default function PipelineSelector({ pipelines, selectedId, onChange }: PipelineSelectorProps) {
  if (pipelines.length <= 1) return null

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Pipeline</InputLabel>
      <Select
        value={selectedId}
        label="Pipeline"
        onChange={(e) => onChange(e.target.value)}
      >
        {pipelines.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name} {p.isDefault ? '(Default)' : ''}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
