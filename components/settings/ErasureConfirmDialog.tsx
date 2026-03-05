'use client'

import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { DeleteForever, Warning } from '@mui/icons-material'
import { useConfirmErasureMutation } from '@/store/api/gdprApi'

interface ErasureConfirmDialogProps {
  open: boolean
  requestId: string
  contactName: string
  contactEmail: string
  onClose: () => void
  onSuccess: (anonymizedFields: string[]) => void
}

const ANONYMIZED_ITEMS = [
  'First name → REDACTED',
  'Last name → REDACTED',
  'Email → redacted-{id}@deleted.invalid',
  'Phone number → removed',
  'Address → removed',
  'Notes → removed',
  'Tags → cleared',
  'Company, job title, city, country → removed',
  'Linked deals → contact reference unlinked',
  'Linked activities → contact reference unlinked, descriptions redacted',
]

export function ErasureConfirmDialog({
  open,
  requestId,
  contactName,
  contactEmail,
  onClose,
  onSuccess,
}: ErasureConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [confirmErasure, { isLoading, error }] = useConfirmErasureMutation()

  const isConfirmed = confirmText === 'DELETE'

  const handleConfirm = async () => {
    if (!isConfirmed) return

    const result = await confirmErasure({
      id: requestId,
      body: { confirmation: 'DELETE' },
    })

    if ('data' in result && result.data) {
      onSuccess(result.data.anonymizedFields)
      setConfirmText('')
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setConfirmText('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <DeleteForever />
        Confirm Right to Erasure
      </DialogTitle>

      <DialogContent>
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          This action is <strong>irreversible</strong>. The following personal
          data for <strong>{contactName}</strong> ({contactEmail}) will be
          permanently anonymized.
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          What will be anonymized:
        </Typography>

        <List dense disablePadding sx={{ mb: 3 }}>
          {ANONYMIZED_ITEMS.map((item) => (
            <ListItem key={item} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 24 }}>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    display: 'block',
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={item}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>

        <Alert severity="warning" sx={{ mb: 2 }}>
          Business records (deals, activities) are preserved for audit purposes
          but all personal identifiers are removed.
        </Alert>

        <Typography variant="body2" color="text.secondary" mb={1}>
          Type <strong>DELETE</strong> to confirm you understand this action
          cannot be undone:
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="DELETE"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          error={confirmText.length > 0 && !isConfirmed}
          helperText={
            confirmText.length > 0 && !isConfirmed
              ? 'You must type DELETE exactly'
              : undefined
          }
          disabled={isLoading}
          autoComplete="off"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {'data' in error
              ? String((error.data as Record<string, unknown>)?.error ?? 'Erasure failed')
              : 'Erasure failed. Please try again.'}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={
            isLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />
          }
          onClick={handleConfirm}
          disabled={!isConfirmed || isLoading}
        >
          {isLoading ? 'Erasing...' : 'Confirm Erasure'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
