'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { CreateCampaignSchema, type CreateCampaignInput } from '@/lib/validators/campaignSchema'
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from '@/store/api/campaignsApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import type { ICampaign } from '@/types/campaign'
import { RecipientFilter } from './RecipientFilter'
import { TemplateEditor } from './TemplateEditor'

interface CampaignFormProps {
  campaign?: ICampaign
  onSuccess: (campaign: ICampaign) => void
  onCancel?: () => void
}

export function CampaignForm({ campaign, onSuccess, onCancel }: CampaignFormProps) {
  const dispatch = useAppDispatch()
  const isEditing = Boolean(campaign)

  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation()
  const [updateCampaign, { isLoading: isUpdating }] = useUpdateCampaignMutation()
  const isLoading = isCreating || isUpdating

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(CreateCampaignSchema),
    defaultValues: {
      name: '',
      subject: '',
      htmlBody: '',
      textBody: '',
      recipientFilter: {
        tags: [],
        country: '',
        ownerId: '',
      },
    },
  })

  useEffect(() => {
    if (campaign) {
      reset({
        name: campaign.name,
        subject: campaign.subject,
        htmlBody: campaign.htmlBody,
        textBody: campaign.textBody ?? '',
        recipientFilter: {
          tags: campaign.recipientFilter.tags ?? [],
          country: campaign.recipientFilter.country ?? '',
          ownerId: campaign.recipientFilter.ownerId ?? '',
        },
      })
    }
  }, [campaign, reset])

  const onSubmit = async (data: CreateCampaignInput) => {
    // Strip empty strings from recipientFilter so the backend receives clean data
    const cleanFilter: CreateCampaignInput['recipientFilter'] = {
      tags: data.recipientFilter?.tags?.length ? data.recipientFilter.tags : undefined,
      country: data.recipientFilter?.country || undefined,
      ownerId: data.recipientFilter?.ownerId || undefined,
    }

    const payload = { ...data, recipientFilter: cleanFilter }

    try {
      let result: ICampaign
      if (isEditing && campaign) {
        result = await updateCampaign({ id: campaign.id, data: payload }).unwrap()
        dispatch(addNotification({ type: 'success', message: 'Campaign updated' }))
      } else {
        result = await createCampaign(payload).unwrap()
        dispatch(addNotification({ type: 'success', message: 'Campaign created' }))
      }
      onSuccess(result)
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save campaign' }))
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h6" mb={3}>
        {isEditing ? 'Edit Campaign' : 'New Campaign'}
      </Typography>

      <Grid container spacing={3}>
        {/* Campaign name */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Campaign Name"
                required
                fullWidth
                size="small"
                error={Boolean(errors.name)}
                helperText={errors.name?.message ?? 'Internal name for this campaign'}
              />
            )}
          />
        </Grid>

        {/* Email subject */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email Subject"
                required
                fullWidth
                size="small"
                error={Boolean(errors.subject)}
                helperText={errors.subject?.message ?? 'Subject line recipients will see'}
              />
            )}
          />
        </Grid>

        {/* Template editor */}
        <Grid item xs={12}>
          <TemplateEditor control={control} errors={errors} />
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Recipient filter */}
        <Grid item xs={12}>
          <RecipientFilter control={control} errors={errors} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={4}>
        {onCancel && (
          <Button onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </Stack>
    </Box>
  )
}
