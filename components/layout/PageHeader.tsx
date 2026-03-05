'use client'

import { Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

interface PageHeaderProps {
  title: string
  actionLabel?: string
  onAction?: () => void
}

export default function PageHeader({ title, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        {title}
      </Typography>

      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
          size="small"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
