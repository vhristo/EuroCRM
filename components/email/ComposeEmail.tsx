'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Autocomplete,
  Typography,
} from '@mui/material'
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material'
import { useSendEmailMutation } from '@/store/api/emailApi'
import { useGetContactsQuery } from '@/store/api/contactsApi'

const ComposeSchema = z.object({
  to: z.string().email('Must be a valid email address').min(1, 'Recipient required'),
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long'),
  htmlBody: z.string().min(1, 'Email body is required'),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
})

type ComposeFormValues = z.infer<typeof ComposeSchema>

interface ComposeEmailProps {
  open: boolean
  onClose: () => void
  defaultTo?: string
  defaultContactId?: string
  defaultDealId?: string
}

export default function ComposeEmail({
  open,
  onClose,
  defaultTo = '',
  defaultContactId = '',
  defaultDealId = '',
}: ComposeEmailProps) {
  const [sendEmail, { isLoading, error }] = useSendEmailMutation()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data: contactsData } = useGetContactsQuery({ page: 1, limit: 100 })
  const contacts = contactsData?.items ?? []

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ComposeFormValues>({
    resolver: zodResolver(ComposeSchema),
    defaultValues: {
      to: defaultTo,
      subject: '',
      htmlBody: '',
      contactId: defaultContactId,
      dealId: defaultDealId,
    },
  })

  const handleClose = () => {
    reset()
    setSuccessMessage(null)
    onClose()
  }

  const onSubmit = async (values: ComposeFormValues) => {
    setSuccessMessage(null)
    const result = await sendEmail({
      to: values.to,
      subject: values.subject,
      htmlBody: values.htmlBody,
      contactId: values.contactId || undefined,
      dealId: values.dealId || undefined,
    })

    if ('data' in result) {
      setSuccessMessage('Email sent successfully.')
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  const errorMessage =
    error && 'data' in error
      ? (error.data as { error?: string })?.error ?? 'Failed to send email'
      : error
      ? 'Failed to send email'
      : null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex items-center justify-between">
          <span>Compose Email</span>
          <Button onClick={handleClose} size="small" color="inherit">
            <CloseIcon fontSize="small" />
          </Button>
        </div>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={3}>
            {successMessage && <Alert severity="success">{successMessage}</Alert>}
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            {/* To field with contact autocomplete */}
            <Controller
              name="to"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={contacts
                    .filter((c) => !!c.email)
                    .map((c) => ({
                      label: `${c.firstName} ${c.lastName} <${c.email}>`,
                      value: c.email ?? '',
                      contactId: c.id,
                    }))}
                  getOptionLabel={(opt) =>
                    typeof opt === 'string' ? opt : opt.label
                  }
                  onInputChange={(_e, val) => field.onChange(val)}
                  onChange={(_e, opt) => {
                    if (opt && typeof opt !== 'string') {
                      field.onChange(opt.value)
                    }
                  }}
                  inputValue={field.value}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="To"
                      required
                      error={!!errors.to}
                      helperText={errors.to?.message}
                      size="small"
                    />
                  )}
                />
              )}
            />

            <TextField
              label="Subject"
              required
              size="small"
              error={!!errors.subject}
              helperText={errors.subject?.message}
              {...register('subject')}
            />

            <div>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Body *
              </Typography>
              <TextField
                multiline
                minRows={10}
                fullWidth
                placeholder="Write your email here... HTML is supported."
                error={!!errors.htmlBody}
                helperText={errors.htmlBody?.message}
                {...register('htmlBody')}
                sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
            </div>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            disabled={isLoading}
          >
            {isLoading ? 'Sending…' : 'Send Email'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
