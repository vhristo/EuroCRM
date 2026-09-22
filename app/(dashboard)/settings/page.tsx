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
  Tabs,
  Tab,
  Box,
} from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import CompanyManager from '@/components/organizations/CompanyManager'
import { useAuth } from '@/hooks/useAuth'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { addNotification } from '@/store/slices/uiSlice'
import {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from '@/store/api/settingsApi'
import { CustomFieldBuilder } from '@/components/settings/CustomFieldBuilder'
import PipelineManager from '@/components/settings/PipelineManager'
import EmailConfigForm from '@/components/settings/EmailConfigForm'
import ApiKeyManager from '@/components/settings/ApiKeyManager'
import WebhookManager from '@/components/settings/WebhookManager'
import { GdprManager } from '@/components/settings/GdprManager'
import { CURRENCIES } from '@/utils/constants'

/** Tabs are addressed by key, not position, so the set can differ by role. */
const TAB_LABELS = {
  companies: 'Companies',
  organization: 'Organization',
  profile: 'Profile',
  pipelines: 'Pipelines',
  customFields: 'Custom Fields',
  emailConfig: 'Email Config',
  apiKeys: 'API Keys',
  webhooks: 'Webhooks',
  gdpr: 'GDPR / Privacy',
} as const

type TabKey = keyof typeof TAB_LABELS

const ADMIN_TABS: TabKey[] = [
  'companies',
  'organization',
  'profile',
  'pipelines',
  'customFields',
  'emailConfig',
  'apiKeys',
  'webhooks',
  'gdpr',
]

// Everyone can see the companies they belong to and edit their own profile —
// those are account-level, not organization-level.
const MEMBER_TABS: TabKey[] = ['companies', 'profile']

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode
  value: TabKey
  index: TabKey
}) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null
}

export default function SettingsPage() {
  const { user, accessToken } = useAuth()
  const dispatch = useAppDispatch()
  const isAdmin = user?.role === 'admin'
  const tabs = isAdmin ? ADMIN_TABS : MEMBER_TABS
  const [activeTab, setActiveTab] = useState<TabKey>('companies')
  const activeIndex = Math.max(0, tabs.indexOf(activeTab))

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

  if (org && !orgInitialized) {
    setOrgName(org.name)
    setCurrency(org.settings?.defaultCurrency ?? 'EUR')
    setTimezone(org.settings?.timezone ?? 'Europe/Berlin')
    setOrgInitialized(true)
  }

  const handleSaveOrg = async () => {
    try {
      await updateOrg({
        name: orgName,
        settings: { defaultCurrency: currency, timezone },
      }).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Organization settings saved.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save organization settings.' }))
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
      dispatch(addNotification({ type: 'success', message: 'Profile updated.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update profile.' }))
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      dispatch(addNotification({ type: 'success', message: 'Password changed.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to change password. Check your current password.' }))
    }
  }

  return (
    <div className="p-6">
      <PageHeader title="Settings" />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs
          value={activeIndex}
          onChange={(_e, v: number) => setActiveTab(tabs[v])}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((key) => (
            <Tab key={key} label={TAB_LABELS[key]} />
          ))}
        </Tabs>
      </Box>

      {!isAdmin && (
        <Alert severity="info" sx={{ mt: 2 }}>
          You are a {user?.role?.replace('_', ' ')} in this company. Only
          administrators can change its settings.
        </Alert>
      )}

      {/* Companies */}
      <TabPanel value={activeTab} index="companies">
        <CompanyManager />
      </TabPanel>

      {/* Organization */}
      <TabPanel value={activeTab} index="organization">
        <Card>
          <CardContent>
            <Typography variant="h6" className="mb-4">Organization</Typography>
            {orgLoading ? (
              <CircularProgress size={24} />
            ) : (
              <div className="flex flex-col gap-4" style={{ maxWidth: 500 }}>
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
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Profile */}
      <TabPanel value={activeTab} index="profile">
        <Card>
          <CardContent>
            <Typography variant="h6" className="mb-4">Your Profile</Typography>
            <div className="flex flex-col gap-4" style={{ maxWidth: 500 }}>
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
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Pipelines */}
      <TabPanel value={activeTab} index="pipelines">
        <PipelineManager />
      </TabPanel>

      {/* Custom Fields */}
      <TabPanel value={activeTab} index="customFields">
        <Card>
          <CardContent>
            <CustomFieldBuilder />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Email Config */}
      <TabPanel value={activeTab} index="emailConfig">
        <EmailConfigForm />
      </TabPanel>

      {/* API Keys */}
      <TabPanel value={activeTab} index="apiKeys">
        <ApiKeyManager />
      </TabPanel>

      {/* Webhooks */}
      <TabPanel value={activeTab} index="webhooks">
        <WebhookManager />
      </TabPanel>

      {/* GDPR / Privacy */}
      <TabPanel value={activeTab} index="gdpr">
        <GdprManager />
      </TabPanel>
    </div>
  )
}
