'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CodeIcon from '@mui/icons-material/Code'
import {
  useGetWebFormQuery,
  useCreateWebFormMutation,
  useUpdateWebFormMutation,
} from '@/store/api/webFormsApi'
import type { IWebForm } from '@/types/webForm'
import WebFormBuilder from '@/components/web-forms/WebFormBuilder'
import WebFormPreview from '@/components/web-forms/WebFormPreview'
import EmbedCodeDialog from '@/components/web-forms/EmbedCodeDialog'

const DEFAULT_FORM: Partial<IWebForm> = {
  name: '',
  description: '',
  fields: [],
  styling: {
    primaryColor: '#1976d2',
    backgroundColor: '#ffffff',
    buttonText: 'Submit',
  },
  successMessage: 'Thank you! We will be in touch shortly.',
  active: true,
}

export default function WebFormEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = params.id === 'new'

  const [form, setForm] = useState<Partial<IWebForm>>(DEFAULT_FORM)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: existing, isLoading: isLoadingExisting } = useGetWebFormQuery(params.id, {
    skip: isNew,
  })

  const [createWebForm, { isLoading: isCreating }] = useCreateWebFormMutation()
  const [updateWebForm, { isLoading: isUpdating }] = useUpdateWebFormMutation()

  const isSaving = isCreating || isUpdating

  useEffect(() => {
    if (existing) {
      setForm(existing)
    }
  }, [existing])

  async function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)

    if (!form.name?.trim()) {
      setSaveError('Form name is required.')
      return
    }
    if (!form.fields || form.fields.length === 0) {
      setSaveError('At least one field is required.')
      return
    }

    try {
      if (isNew) {
        const result = await createWebForm({
          name: form.name,
          description: form.description,
          fields: form.fields,
          styling: form.styling,
          successMessage: form.successMessage,
          active: form.active ?? true,
        }).unwrap()
        router.replace(`/web-forms/${result.id}`)
      } else {
        await updateWebForm({
          id: params.id,
          data: {
            name: form.name,
            description: form.description,
            fields: form.fields,
            styling: form.styling,
            successMessage: form.successMessage,
            active: form.active,
          },
        }).unwrap()
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      setSaveError('Failed to save form. Please try again.')
    }
  }

  if (!isNew && isLoadingExisting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {isNew ? 'New Web Form' : (form.name || 'Edit Web Form')}
          </Typography>
          {!isNew && existing?.slug && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              /{existing.slug}
            </Typography>
          )}
        </div>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {!isNew && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.active ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Typography
                  variant="body2"
                  color={form.active ? 'success.main' : 'text.secondary'}
                >
                  {form.active ? 'Active' : 'Inactive'}
                </Typography>
              }
            />
          )}
          {!isNew && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CodeIcon />}
              onClick={() => setEmbedOpen(true)}
            >
              Embed
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/web-forms')}
          >
            Back
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={
              isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
            }
            onClick={handleSave}
            disabled={isSaving}
          >
            {isNew ? 'Create Form' : 'Save Changes'}
          </Button>
        </Stack>
      </div>

      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}
      {saveSuccess && (
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          Form saved successfully.
        </Alert>
      )}

      {/* Builder + Preview side by side */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
          flex: 1,
          alignItems: 'start',
        }}
      >
        {/* Builder */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" mb={1} letterSpacing={0.5}>
            BUILDER
          </Typography>
          <WebFormBuilder value={form} onChange={setForm} />
        </Box>

        {/* Preview */}
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
          <Typography variant="subtitle2" color="text.secondary" mb={1} letterSpacing={0.5}>
            PREVIEW
          </Typography>
          <WebFormPreview form={form} />
        </Box>
      </Box>

      {/* Embed dialog */}
      {!isNew && embedOpen && existing && (
        <EmbedCodeDialog
          open
          onClose={() => setEmbedOpen(false)}
          webFormId={existing.id}
          webFormName={existing.name}
        />
      )}
    </Box>
  )
}
