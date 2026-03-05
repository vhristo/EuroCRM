'use client'

import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { IWebForm, IWebFormField } from '@/types/webForm'

interface WebFormPreviewProps {
  form: Partial<IWebForm>
}

export default function WebFormPreview({ form }: WebFormPreviewProps) {
  const fields: IWebFormField[] = (form.fields ?? []).slice().sort((a, b) => a.order - b.order)
  const styling = form.styling ?? {
    primaryColor: '#1976d2',
    backgroundColor: '#ffffff',
    buttonText: 'Submit',
  }

  return (
    <Box
      sx={{
        bgcolor: styling.backgroundColor,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 3,
        minHeight: 300,
      }}
    >
      {/* Form header */}
      {(form.name || form.description) && (
        <Box mb={3}>
          {form.name && (
            <Typography variant="h6" fontWeight={700} mb={0.5}>
              {form.name}
            </Typography>
          )}
          {form.description && (
            <Typography variant="body2" color="text.secondary">
              {form.description}
            </Typography>
          )}
        </Box>
      )}

      {fields.length === 0 && (
        <Box
          py={6}
          textAlign="center"
          border="2px dashed"
          borderColor="divider"
          borderRadius={2}
        >
          <Typography color="text.secondary" fontSize="0.875rem">
            Add fields to see a preview
          </Typography>
        </Box>
      )}

      <Stack spacing={2}>
        {fields.map((field) => {
          const label = field.required ? `${field.label} *` : field.label

          switch (field.type) {
            case 'textarea':
              return (
                <TextField
                  key={field.id}
                  label={label}
                  multiline
                  rows={3}
                  fullWidth
                  disabled
                  size="small"
                />
              )
            case 'select':
              return (
                <TextField
                  key={field.id}
                  label={label}
                  select
                  fullWidth
                  disabled
                  size="small"
                  value=""
                >
                  {(field.options ?? []).map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              )
            default:
              return (
                <TextField
                  key={field.id}
                  label={label}
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                  fullWidth
                  disabled
                  size="small"
                />
              )
          }
        })}

        {fields.length > 0 && (
          <Button
            variant="contained"
            disabled
            sx={{
              bgcolor: `${styling.primaryColor} !important`,
              color: '#fff !important',
              alignSelf: 'flex-start',
              opacity: 0.85,
            }}
          >
            {styling.buttonText || 'Submit'}
          </Button>
        )}
      </Stack>

      {/* Success message preview */}
      {form.successMessage && (
        <Box mt={3} p={1.5} bgcolor="success.50" borderRadius={1} border="1px solid" borderColor="success.200">
          <Typography variant="caption" color="success.main" fontWeight={500}>
            Success message: &quot;{form.successMessage}&quot;
          </Typography>
        </Box>
      )}
    </Box>
  )
}
