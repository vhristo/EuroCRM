'use client'

import { Chip, ChipProps } from '@mui/material'

type StatusColor = NonNullable<ChipProps['color']>

const DEFAULT_STATUS_COLOR_MAP: Record<string, StatusColor> = {
  // Deal statuses
  open: 'primary',
  won: 'success',
  lost: 'error',
  // Lead statuses
  new: 'info',
  contacted: 'primary',
  qualified: 'success',
  unqualified: 'default',
  converted: 'success',
  // Activity states
  done: 'success',
  pending: 'warning',
  overdue: 'error',
  // Generic
  active: 'success',
  inactive: 'default',
  archived: 'default',
}

interface StatusChipProps {
  status: string
  /** Optional label override — defaults to capitalised status string */
  label?: string
  /** Optional per-instance color map that merges with the default map */
  colorMap?: Record<string, StatusColor>
  size?: ChipProps['size']
}

export function StatusChip({
  status,
  label,
  colorMap,
  size = 'small',
}: StatusChipProps) {
  const mergedMap = colorMap
    ? { ...DEFAULT_STATUS_COLOR_MAP, ...colorMap }
    : DEFAULT_STATUS_COLOR_MAP

  const color: StatusColor = mergedMap[status.toLowerCase()] ?? 'default'
  const displayLabel =
    label ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      variant="outlined"
    />
  )
}

export default StatusChip
