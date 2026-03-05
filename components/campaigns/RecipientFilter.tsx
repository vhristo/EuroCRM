'use client'

import { Controller, Control, FieldErrors } from 'react-hook-form'
import {
  Autocomplete,
  Box,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import type { CreateCampaignInput } from '@/lib/validators/campaignSchema'

interface RecipientFilterProps {
  control: Control<CreateCampaignInput>
  errors: FieldErrors<CreateCampaignInput>
}

const SUGGESTED_TAGS = [
  'VIP',
  'Prospect',
  'Customer',
  'Partner',
  'Supplier',
  'Hot Lead',
  'Cold Lead',
  'Newsletter',
]

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'GB', 'CH', 'NO',
]

export function RecipientFilter({ control, errors }: RecipientFilterProps) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom color="text.secondary">
        Recipient Filter
      </Typography>
      <Typography variant="caption" color="text.disabled" display="block" mb={2}>
        Leave all filters empty to send to all contacts with an email address.
      </Typography>

      <Grid container spacing={2}>
        {/* Tags filter */}
        <Grid item xs={12}>
          <Controller
            name="recipientFilter.tags"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={SUGGESTED_TAGS}
                value={field.value ?? []}
                onChange={(_event, newValue) => field.onChange(newValue as string[])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Tags"
                    size="small"
                    placeholder="Add tag..."
                    helperText="Only send to contacts that have ALL of these tags. Press Enter to add a custom tag."
                    error={Boolean(errors.recipientFilter?.tags)}
                  />
                )}
              />
            )}
          />
        </Grid>

        {/* Country filter */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="recipientFilter.country"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={EU_COUNTRIES}
                value={field.value ?? null}
                onChange={(_event, newValue) => field.onChange(newValue ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Country"
                    size="small"
                    placeholder="Any country"
                    helperText="Only send to contacts in this country (country code)."
                    error={Boolean(errors.recipientFilter?.country)}
                  />
                )}
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
