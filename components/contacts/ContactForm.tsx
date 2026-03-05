'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CreateContactSchema, type CreateContactInput } from '@/lib/validators/contactSchema'
import {
  useCreateContactMutation,
  useUpdateContactMutation,
} from '@/store/api/contactsApi'
import { useGetCustomFieldsQuery } from '@/store/api/customFieldsApi'
import { validateCustomFieldValues } from '@/lib/validators/customFieldSchema'
import { CustomFieldRenderer } from '@/components/shared/CustomFieldRenderer'
import type { IContact } from '@/types/contact'
import { CURRENCIES } from '@/utils/constants'

interface ContactFormProps {
  /** Pass a contact to enter edit mode; omit for create mode */
  contact?: IContact
  onSuccess: (contact: IContact) => void
  onCancel?: () => void
}

const SUGGESTED_TAGS = [
  'VIP',
  'Prospect',
  'Customer',
  'Partner',
  'Supplier',
  'Hot Lead',
  'Cold Lead',
]

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const isEditing = Boolean(contact)

  const [createContact, { isLoading: isCreating }] = useCreateContactMutation()
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation()
  const isLoading = isCreating || isUpdating

  // Custom fields
  const { data: customFieldDefs = [] } = useGetCustomFieldsQuery('contacts')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(
    contact?.customFields ?? {}
  )
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({})

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(CreateContactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      country: '',
      city: '',
      address: '',
      currency: 'EUR',
      tags: [],
      notes: '',
    },
  })

  useEffect(() => {
    if (contact) {
      reset({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        company: contact.company ?? '',
        jobTitle: contact.jobTitle ?? '',
        country: contact.country ?? '',
        city: contact.city ?? '',
        address: contact.address ?? '',
        currency: contact.currency,
        tags: contact.tags,
        notes: contact.notes ?? '',
      })
      setCustomFieldValues(contact.customFields ?? {})
    }
  }, [contact, reset])

  const handleCustomFieldChange = (key: string, value: unknown) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }))
    // Clear error for this key when user changes the value
    setCustomFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const onSubmit = async (data: CreateContactInput) => {
    // Validate custom fields before submitting
    const cfErrors = validateCustomFieldValues(customFieldDefs, customFieldValues)
    if (Object.keys(cfErrors).length > 0) {
      setCustomFieldErrors(cfErrors)
      return
    }

    try {
      let result: IContact
      const payload = {
        ...data,
        ...(customFieldDefs.length > 0 ? { customFields: customFieldValues } : {}),
      }
      if (isEditing && contact) {
        result = await updateContact({ id: contact.id, data: payload }).unwrap()
      } else {
        result = await createContact(payload).unwrap()
      }
      onSuccess(result)
    } catch {
      // RTK Query surfaces errors via the mutation result — the parent can
      // observe isError if it needs to show a notification
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h6" mb={3}>
        {isEditing ? 'Edit Contact' : 'New Contact'}
      </Typography>

      <Grid container spacing={2}>
        {/* Name row */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                required
                fullWidth
                size="small"
                error={Boolean(errors.firstName)}
                helperText={errors.firstName?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Last Name"
                required
                fullWidth
                size="small"
                error={Boolean(errors.lastName)}
                helperText={errors.lastName?.message}
              />
            )}
          />
        </Grid>

        {/* Contact info */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                type="email"
                fullWidth
                size="small"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Phone"
                fullWidth
                size="small"
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
              />
            )}
          />
        </Grid>

        {/* Company info */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="company"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Company"
                fullWidth
                size="small"
                error={Boolean(errors.company)}
                helperText={errors.company?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="jobTitle"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Job Title"
                fullWidth
                size="small"
                error={Boolean(errors.jobTitle)}
                helperText={errors.jobTitle?.message}
              />
            )}
          />
        </Grid>

        {/* Location + Currency */}
        <Grid item xs={12} sm={4}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Country"
                fullWidth
                size="small"
                error={Boolean(errors.country)}
                helperText={errors.country?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="City"
                fullWidth
                size="small"
                error={Boolean(errors.city)}
                helperText={errors.city?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Currency"
                select
                fullWidth
                size="small"
                error={Boolean(errors.currency)}
                helperText={errors.currency?.message}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        {/* Address */}
        <Grid item xs={12}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Address"
                fullWidth
                size="small"
                error={Boolean(errors.address)}
                helperText={errors.address?.message}
              />
            )}
          />
        </Grid>

        {/* Tags — freeSolo Autocomplete */}
        <Grid item xs={12}>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={SUGGESTED_TAGS}
                value={field.value}
                onChange={(_event, newValue) =>
                  field.onChange(newValue as string[])
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    size="small"
                    placeholder="Add tag..."
                    error={Boolean(errors.tags)}
                    helperText={
                      errors.tags?.message ?? 'Press Enter to add a custom tag'
                    }
                  />
                )}
              />
            )}
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notes"
                multiline
                rows={3}
                fullWidth
                size="small"
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message}
              />
            )}
          />
        </Grid>
      </Grid>

      {/* Custom Fields */}
      {customFieldDefs.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <CustomFieldRenderer
            fields={customFieldDefs}
            values={customFieldValues}
            onChange={handleCustomFieldChange}
            errors={customFieldErrors}
          />
        </>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
        {onCancel && (
          <Button onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={
            isLoading ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Contact'}
        </Button>
      </Stack>
    </Box>
  )
}
