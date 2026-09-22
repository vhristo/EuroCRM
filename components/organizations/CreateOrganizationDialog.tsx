'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  CreateOrganizationSchema,
  type CreateOrganizationInput,
} from '@/lib/validators/organizationSchema'
import { useCreateOrganizationMutation } from '@/store/api/organizationsApi'
import { useOrganizationSwitch } from '@/hooks/useOrganizationSwitch'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'

interface CreateOrganizationDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateOrganizationDialog({ open, onClose }: CreateOrganizationDialogProps) {
  const dispatch = useAppDispatch()
  const [createOrganization, { isLoading }] = useCreateOrganizationMutation()
  const { applySession } = useOrganizationSwitch()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (open) reset({ name: '' })
  }, [open, reset])

  const onSubmit = async (data: CreateOrganizationInput) => {
    try {
      const session = await createOrganization(data).unwrap()
      onClose()
      applySession(session)
    } catch {
      dispatch(
        addNotification({ type: 'error', message: 'Could not create the company.' })
      )
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create company</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: '0.875rem' }}>
            A new company starts empty. Its contacts, deals and settings are kept
            entirely separate from your other companies.
          </DialogContentText>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus
                label="Company name"
                size="small"
                fullWidth
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CreateOrganizationDialog
