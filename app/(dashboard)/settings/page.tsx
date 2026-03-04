'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from '@/store/api/settingsApi'
import { CURRENCIES } from '@/utils/constants'

export default function SettingsPage() {
  const { user, accessToken } = useAuth()
  const dispatch = useAppDispatch()

  const { data: org, isLoading: orgLoading } = useGetOrganizationQuery()
  const [updateOrg, { isLoading: savingOrg }] = useUpdateOrganizationMutation()
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation()
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation()

  const [orgName, setOrgName] = useState('')
  const [currency, setCurrency] = useState('')
  const [timezone, setTimezone] = useState('')
  const [orgInitialized, setOrgInitialized] = useState(false)

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [orgMsg, setOrgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Initialize org fields when data arrives
  if (org && !orgInitialized) {
    setOrgName(org.name)
    setCurrency(org.settings?.defaultCurrency ?? 'EUR')
    setTimezone(org.settings?.timezone ?? 'Europe/Berlin')
    setOrgInitialized(true)
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <PageHeader title="Settings" />
        <Alert severity="warning" className="mt-4">
          Only administrators can access settings.
        </Alert>
      </div>
    )
  }

  const handleSaveOrg = async () => {
    try {
      await updateOrg({
        name: orgName,
        settings: { defaultCurrency: currency, timezone },
      }).unwrap()
      setOrgMsg({ type: 'success', text: 'Organization settings saved.' })
    } catch {
      setOrgMsg({ type: 'error', text: 'Failed to save organization settings.' })
    }
  }

  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfile({ firstName, lastName }).unwrap()
      if (user && accessToken) {
        dispatch(setCredentials({
          accessToken,
          user: { ...user, firstName: updated.firstName, lastName: updated.lastName },
        }))
      }
      setProfileMsg({ type: 'success', text: 'Profile updated.' })
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' })
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMsg({ type: 'success', text: 'Password changed.' })
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password. Check your current password.' })
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="Settings" />

      <Grid container spacing={3} className="mt-2">
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Organization</Typography>
              {orgLoading ? (
                <CircularProgress size={24} />
              ) : (
                <div className="flex flex-col gap-4">
                  <TextField
                    label="Organization Name"
                    fullWidth
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <TextField
                    label="Default Currency"
                    fullWidth
                    select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Timezone"
                    fullWidth
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleSaveOrg} disabled={savingOrg}>
                    {savingOrg ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {orgMsg && (
                    <Alert severity={orgMsg.type} onClose={() => setOrgMsg(null)}>
                      {orgMsg.text}
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Your Profile</Typography>
              <div className="flex flex-col gap-4">
                <TextField label="Email" fullWidth value={user?.email ?? ''} disabled />
                <TextField
                  label="First Name"
                  fullWidth
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <TextField label="Role" fullWidth value={user?.role ?? ''} disabled />
                <Button variant="contained" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Update Profile'}
                </Button>
                {profileMsg && (
                  <Alert severity={profileMsg.type} onClose={() => setProfileMsg(null)}>
                    {profileMsg.text}
                  </Alert>
                )}

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Change Password
                </Typography>
                <TextField
                  label="Current Password"
                  type="password"
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button variant="outlined" onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                {passwordMsg && (
                  <Alert severity={passwordMsg.type} onClose={() => setPasswordMsg(null)}>
                    {passwordMsg.text}
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}
