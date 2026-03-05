'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {
  Save as SaveIcon,
  WifiTethering as TestIcon,
} from '@mui/icons-material'
import { useGetEmailConfigQuery, useSaveEmailConfigMutation, useTestEmailConnectionMutation } from '@/store/api/emailApi'

const ConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z
    .number({ invalid_type_error: 'Port must be a number' })
    .int()
    .min(1)
    .max(65535),
  secure: z.boolean(),
  username: z.string().min(1, 'SMTP username is required'),
  password: z.string().optional(),
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Must be a valid email'),
})

type ConfigFormValues = z.infer<typeof ConfigSchema>

export default function EmailConfigForm() {
  const { data: config, isLoading } = useGetEmailConfigQuery()
  const [saveConfig, { isLoading: isSaving, isSuccess: isSaved, error: saveError }] =
    useSaveEmailConfigMutation()
  const [testConnection, { isLoading: isTesting, data: testResult, error: testError }] =
    useTestEmailConnectionMutation()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(ConfigSchema),
    defaultValues: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromName: '',
      fromEmail: '',
    },
  })

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      reset({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: '', // never pre-fill password
        fromName: config.fromName,
        fromEmail: config.fromEmail,
      })
    }
  }, [config, reset])

  const secure = watch('secure')

  const onSubmit = async (values: ConfigFormValues) => {
    await saveConfig({
      host: values.host,
      port: values.port,
      secure: values.secure,
      username: values.username,
      // Only send password if provided (non-empty string)
      password: values.password && values.password.length > 0 ? values.password : (config?.password ?? ''),
      fromName: values.fromName,
      fromEmail: values.fromEmail,
    })
  }

  const handleTest = async () => {
    await testConnection()
  }

  const saveErrorMsg =
    saveError && 'data' in saveError
      ? (saveError.data as { error?: string })?.error ?? 'Save failed'
      : saveError
      ? 'Save failed'
      : null

  const testErrorMsg =
    testError && 'data' in testError
      ? (testError.data as { error?: string; detail?: string })?.detail ??
        (testError.data as { error?: string })?.error ??
        'Test failed'
      : testError
      ? 'Connection test failed'
      : null

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <CircularProgress />
      </div>
    )
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          SMTP Email Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure your outgoing mail server. Credentials are encrypted at rest.
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={3}>
            {isSaved && (
              <Alert severity="success">SMTP configuration saved successfully.</Alert>
            )}
            {saveErrorMsg && <Alert severity="error">{saveErrorMsg}</Alert>}

            {/* SMTP Server */}
            <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">
              Server Settings
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SMTP Host"
                required
                fullWidth
                size="small"
                placeholder="smtp.example.com"
                error={!!errors.host}
                helperText={errors.host?.message}
                {...register('host')}
              />
              <TextField
                label="Port"
                required
                size="small"
                sx={{ minWidth: 120 }}
                placeholder="587"
                type="number"
                error={!!errors.port}
                helperText={errors.port?.message}
                {...register('port', { valueAsNumber: true })}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={secure}
                  onChange={(e) => setValue('secure', e.target.checked)}
                />
              }
              label="Use SSL/TLS (port 465)"
            />

            <Divider />

            {/* Authentication */}
            <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">
              Authentication
            </Typography>

            <TextField
              label="SMTP Username"
              required
              size="small"
              autoComplete="email"
              error={!!errors.username}
              helperText={errors.username?.message}
              {...register('username')}
            />

            <TextField
              label={config ? 'SMTP Password (leave blank to keep current)' : 'SMTP Password'}
              size="small"
              type="password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
            />

            <Divider />

            {/* From details */}
            <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">
              From Details
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="From Name"
                required
                fullWidth
                size="small"
                placeholder="EuroCRM Sales"
                error={!!errors.fromName}
                helperText={errors.fromName?.message}
                {...register('fromName')}
              />
              <TextField
                label="From Email"
                required
                fullWidth
                size="small"
                type="email"
                placeholder="sales@yourcompany.com"
                error={!!errors.fromEmail}
                helperText={errors.fromEmail?.message}
                {...register('fromEmail')}
              />
            </Stack>

            {/* Test connection result */}
            {testResult && (
              <Alert severity="success">{testResult.message}</Alert>
            )}
            {testErrorMsg && <Alert severity="error">{testErrorMsg}</Alert>}

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={
                  isTesting ? <CircularProgress size={16} /> : <TestIcon />
                }
                onClick={handleTest}
                disabled={isTesting || !config}
                title={!config ? 'Save configuration first' : 'Test SMTP connection'}
              >
                {isTesting ? 'Testing…' : 'Test Connection'}
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={
                  isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                }
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Configuration'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  )
}
