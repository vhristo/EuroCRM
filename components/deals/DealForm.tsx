'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Autocomplete,
  InputAdornment,
} from '@mui/material'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import { useCreateDealMutation, useUpdateDealMutation } from '@/store/api/dealsApi'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useGetCustomFieldsQuery } from '@/store/api/customFieldsApi'
import { validateCustomFieldValues } from '@/lib/validators/customFieldSchema'
import { CustomFieldRenderer } from '@/components/shared/CustomFieldRenderer'
import type { IDeal } from '@/types/deal'
import { CURRENCIES } from '@/utils/constants'

// Client-side schema — value is entered in main currency units (euros), converted to cents on submit
const DealFormSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  valueEuros: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .min(0, 'Value must be 0 or greater'),
  currency: z.string().length(3),
  stage: z.string().min(1, 'Stage is required'),
  contactId: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
})

type DealFormValues = z.infer<typeof DealFormSchema>

interface DealFormProps {
  deal?: IDeal
  pipelineId: string
  onSuccess: () => void
}

export default function DealForm({ deal, pipelineId, onSuccess }: DealFormProps) {
  const { data: pipelines } = useGetPipelinesQuery()
  const [activePipelineId, setActivePipelineId] = useState(pipelineId)
  const pipeline = pipelines?.find((p) => p.id === activePipelineId) ?? pipelines?.[0]
  const stages = useMemo(() => pipeline?.stages ?? [], [pipeline?.stages])

  const { data: contactsData } = useGetContactsQuery({ limit: 100 })
  const contacts = contactsData?.items ?? []

  const [createDeal, { isLoading: creating }] = useCreateDealMutation()
  const [updateDeal, { isLoading: updating }] = useUpdateDealMutation()
  const isSubmitting = creating || updating

  // Custom fields for deals
  const { data: customFieldDefs = [] } = useGetCustomFieldsQuery('deals')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(
    deal?.customFields ?? {}
  )
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({})

  const defaultStageId = stages[0]?.id ?? ''

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(DealFormSchema),
    defaultValues: {
      title: deal?.title ?? '',
      valueEuros: deal ? deal.value / 100 : 0,
      currency: deal?.currency ?? 'EUR',
      stage: deal?.stage ?? defaultStageId,
      contactId: deal?.contactId ?? '',
      probability: deal?.probability ?? stages[0]?.probability ?? 0,
      expectedCloseDate: deal?.expectedCloseDate
        ? deal.expectedCloseDate.slice(0, 10)
        : '',
      notes: deal?.notes ?? '',
    },
  })

  // When stage selection changes, auto-fill probability from stage config
  const selectedStageId = watch('stage')
  useEffect(() => {
    const stage = stages.find((s) => s.id === selectedStageId)
    if (stage && !deal) {
      setValue('probability', stage.probability)
    }
  }, [selectedStageId, stages, setValue, deal])

  const handleCustomFieldChange = (key: string, value: unknown) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }))
    setCustomFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const onSubmit = async (values: DealFormValues) => {
    // Validate custom fields before submitting
    const cfErrors = validateCustomFieldValues(customFieldDefs, customFieldValues)
    if (Object.keys(cfErrors).length > 0) {
      setCustomFieldErrors(cfErrors)
      return
    }

    const payload = {
      title: values.title,
      value: Math.round(values.valueEuros * 100), // convert to cents
      currency: values.currency,
      stage: values.stage,
      pipelineId: pipeline?.id ?? activePipelineId,
      contactId: values.contactId || undefined,
      probability: values.probability,
      expectedCloseDate: values.expectedCloseDate || undefined,
      notes: values.notes || undefined,
      ...(customFieldDefs.length > 0 ? { customFields: customFieldValues } : {}),
    }

    if (deal) {
      await updateDeal({ id: deal.id, data: payload })
    } else {
      await createDeal(payload)
    }

    onSuccess()
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
    >
      <TextField
        label="Deal Title"
        {...register('title')}
        error={!!errors.title}
        helperText={errors.title?.message}
        fullWidth
        size="small"
        autoFocus
      />

      <Box display="flex" gap={1}>
        <TextField
          label="Value"
          type="number"
          inputProps={{ min: 0, step: '0.01' }}
          {...register('valueEuros', { valueAsNumber: true })}
          error={!!errors.valueEuros}
          helperText={errors.valueEuros?.message}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">{watch('currency')}</InputAdornment>
            ),
          }}
        />

        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Currency</InputLabel>
              <Select {...field} label="Currency">
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Box>

      {pipelines && pipelines.length > 1 && (
        <FormControl size="small" fullWidth>
          <InputLabel>Pipeline</InputLabel>
          <Select
            value={activePipelineId}
            label="Pipeline"
            onChange={(e) => {
              setActivePipelineId(e.target.value)
              const newPipeline = pipelines.find((p) => p.id === e.target.value)
              if (newPipeline?.stages[0]) {
                setValue('stage', newPipeline.stages[0].id)
                setValue('probability', newPipeline.stages[0].probability)
              }
            }}
          >
            {pipelines.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Controller
        name="stage"
        control={control}
        render={({ field }) => (
          <FormControl size="small" fullWidth error={!!errors.stage}>
            <InputLabel>Stage</InputLabel>
            <Select {...field} label="Stage">
              {stages
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
            </Select>
            {errors.stage && <FormHelperText>{errors.stage.message}</FormHelperText>}
          </FormControl>
        )}
      />

      <Controller
        name="contactId"
        control={control}
        render={({ field }) => (
          <Autocomplete
            options={contacts}
            getOptionLabel={(c) =>
              `${c.firstName} ${c.lastName}${c.company ? ` — ${c.company}` : ''}`
            }
            value={contacts.find((c) => c.id === field.value) ?? null}
            onChange={(_e, val) => field.onChange(val?.id ?? '')}
            size="small"
            renderInput={(params) => (
              <TextField {...params} label="Contact (optional)" />
            )}
          />
        )}
      />

      <TextField
        label="Probability (%)"
        type="number"
        inputProps={{ min: 0, max: 100, step: 1 }}
        {...register('probability', { valueAsNumber: true })}
        error={!!errors.probability}
        helperText={errors.probability?.message}
        size="small"
      />

      <TextField
        label="Expected Close Date"
        type="date"
        {...register('expectedCloseDate')}
        size="small"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Notes"
        {...register('notes')}
        multiline
        minRows={3}
        size="small"
        fullWidth
      />

      {/* Custom Fields */}
      {customFieldDefs.length > 0 && (
        <>
          <Divider />
          <CustomFieldRenderer
            fields={customFieldDefs}
            values={customFieldValues}
            onChange={handleCustomFieldChange}
            errors={customFieldErrors}
          />
        </>
      )}

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {deal ? 'Save Changes' : 'Create Deal'}
        </Button>
      </Box>
    </Box>
  )
}
