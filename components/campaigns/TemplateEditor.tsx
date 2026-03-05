'use client'

import { Controller, Control, FieldErrors } from 'react-hook-form'
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CodeIcon from '@mui/icons-material/Code'
import type { CreateCampaignInput } from '@/lib/validators/campaignSchema'

interface TemplateEditorProps {
  control: Control<CreateCampaignInput>
  errors: FieldErrors<CreateCampaignInput>
}

const MERGE_TAGS = [
  { label: 'First Name', tag: '{{firstName}}' },
  { label: 'Last Name', tag: '{{lastName}}' },
  { label: 'Email', tag: '{{email}}' },
  { label: 'Company', tag: '{{company}}' },
]

export function TemplateEditor({ control, errors }: TemplateEditorProps) {
  // Insert merge tag at cursor position in a textarea
  const insertMergeTag = (
    fieldValue: string,
    tag: string,
    onChange: (value: string) => void,
    textareaId: string
  ) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (!textarea) {
      onChange(fieldValue + tag)
      return
    }

    const start = textarea.selectionStart ?? fieldValue.length
    const end = textarea.selectionEnd ?? fieldValue.length
    const newValue = fieldValue.slice(0, start) + tag + fieldValue.slice(end)
    onChange(newValue)

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.selectionStart = start + tag.length
      textarea.selectionEnd = start + tag.length
      textarea.focus()
    })
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <CodeIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" color="text.secondary">
          Email Template
        </Typography>
      </Box>

      {/* Merge tag insertion buttons */}
      <Box mb={2}>
        <Typography variant="caption" color="text.disabled" display="block" mb={1}>
          Insert merge tag:
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          {MERGE_TAGS.map(({ label, tag }) => (
            <Tooltip key={tag} title={`Insert ${tag}`}>
              <Controller
                name="htmlBody"
                control={control}
                render={({ field }) => (
                  <Button
                    onClick={() =>
                      insertMergeTag(field.value, tag, field.onChange, 'campaign-html-body')
                    }
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {label}
                  </Button>
                )}
              />
            </Tooltip>
          ))}
        </ButtonGroup>
      </Box>

      <Grid container spacing={2}>
        {/* HTML body */}
        <Grid item xs={12}>
          <Controller
            name="htmlBody"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="campaign-html-body"
                label="HTML Body"
                multiline
                rows={14}
                fullWidth
                size="small"
                required
                error={Boolean(errors.htmlBody)}
                helperText={
                  errors.htmlBody?.message ??
                  'Supports HTML. Use merge tags like {{firstName}} to personalise.'
                }
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            )}
          />
        </Grid>

        {/* Plain text body */}
        <Grid item xs={12}>
          <Controller
            name="textBody"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Plain Text Body (optional)"
                multiline
                rows={5}
                fullWidth
                size="small"
                error={Boolean(errors.textBody)}
                helperText={
                  errors.textBody?.message ??
                  'Shown in email clients that cannot render HTML. Merge tags work here too.'
                }
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
