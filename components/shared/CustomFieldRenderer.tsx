'use client'

import {
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import type { ICustomFieldDefinition } from '@/types/customField'

interface CustomFieldRendererProps {
  fields: ICustomFieldDefinition[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  errors?: Record<string, string>
}

export function CustomFieldRenderer({
  fields,
  values,
  onChange,
  errors = {},
}: CustomFieldRendererProps) {
  if (fields.length === 0) return null

  const sorted = [...fields].sort((a, b) => a.order - b.order)

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
        Custom Fields
      </Typography>

      <Grid container spacing={2}>
        {sorted.map((field) => {
          const value = values[field.name]
          const errorMsg = errors[field.name]

          switch (field.type) {
            case 'text':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    fullWidth
                    size="small"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                  />
                </Grid>
              )

            case 'number':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    type="number"
                    fullWidth
                    size="small"
                    value={value !== undefined && value !== null ? String(value) : ''}
                    onChange={(e) => {
                      const num = e.target.value === '' ? '' : Number(e.target.value)
                      onChange(field.name, num)
                    }}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                  />
                </Grid>
              )

            case 'date':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    type="date"
                    fullWidth
                    size="small"
                    value={typeof value === 'string' ? value.slice(0, 10) : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                  />
                </Grid>
              )

            case 'email':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    type="email"
                    fullWidth
                    size="small"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                  />
                </Grid>
              )

            case 'phone':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    type="tel"
                    fullWidth
                    size="small"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                  />
                </Grid>
              )

            case 'url':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <TextField
                    label={field.label}
                    required={field.required}
                    type="url"
                    fullWidth
                    size="small"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    error={Boolean(errorMsg)}
                    helperText={errorMsg}
                    placeholder="https://"
                  />
                </Grid>
              )

            case 'select': {
              const options = field.options ?? []
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <FormControl
                    fullWidth
                    size="small"
                    required={field.required}
                    error={Boolean(errorMsg)}
                  >
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      label={field.label}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => onChange(field.name, e.target.value)}
                    >
                      {!field.required && (
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                      )}
                      {options.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                    {errorMsg && <FormHelperText>{errorMsg}</FormHelperText>}
                  </FormControl>
                </Grid>
              )
            }

            case 'multiselect': {
              const options = field.options ?? []
              const selectedValues = Array.isArray(value) ? (value as string[]) : []

              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <Autocomplete
                    multiple
                    options={options}
                    value={selectedValues}
                    onChange={(_event, newValue) => onChange(field.name, newValue)}
                    size="small"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={field.label}
                        required={field.required}
                        error={Boolean(errorMsg)}
                        helperText={errorMsg}
                      />
                    )}
                  />
                </Grid>
              )
            }

            case 'checkbox':
              return (
                <Grid item xs={12} sm={6} key={field.id}>
                  <FormControl error={Boolean(errorMsg)}>
                    <FormControlLabel
                      label={field.label}
                      control={
                        <Checkbox
                          checked={Boolean(value)}
                          onChange={(e) => onChange(field.name, e.target.checked)}
                          size="small"
                        />
                      }
                    />
                    {errorMsg && <FormHelperText>{errorMsg}</FormHelperText>}
                  </FormControl>
                </Grid>
              )

            default:
              return null
          }
        })}
      </Grid>
    </>
  )
}
