'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material'
import { RegisterSchema, RegisterInput } from '@/lib/validators/authSchema'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import type { IAuthResponse } from '@/types/auth'

export default function RegisterPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const body: IAuthResponse | { error: string } = await res.json()

      if (!res.ok) {
        setServerError('error' in body ? body.error : 'Registration failed. Please try again.')
        return
      }

      if ('accessToken' in body) {
        dispatch(setCredentials({ user: body.user, accessToken: body.accessToken }))
        router.push('/dashboard')
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
              EC
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            EuroCRM
          </Typography>
        </div>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Create your account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set up EuroCRM for your organisation.
            </Typography>

            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    {...register('firstName')}
                    label="First name"
                    autoComplete="given-name"
                    fullWidth
                    size="small"
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                  <TextField
                    {...register('lastName')}
                    label="Last name"
                    autoComplete="family-name"
                    fullWidth
                    size="small"
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                </div>

                <TextField
                  {...register('organizationName')}
                  label="Organisation name"
                  autoComplete="organization"
                  fullWidth
                  size="small"
                  error={!!errors.organizationName}
                  helperText={errors.organizationName?.message}
                />

                <TextField
                  {...register('email')}
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  fullWidth
                  size="small"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />

                <TextField
                  {...register('password')}
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  fullWidth
                  size="small"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  sx={{ mt: 1 }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    'Create account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 3 }}
        >
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Sign in
          </Link>
        </Typography>
      </div>
    </div>
  )
}
