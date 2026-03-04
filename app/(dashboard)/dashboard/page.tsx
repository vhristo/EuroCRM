'use client'

import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import HandshakeIcon from '@mui/icons-material/Handshake'
import EuroIcon from '@mui/icons-material/Euro'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PageHeader from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { useGetDashboardStatsQuery } from '@/store/api/reportsApi'
import { formatCurrency } from '@/utils/formatters'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  loading?: boolean
}

function StatCard({ label, value, icon, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            )}
          </div>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.50`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${color}.600`,
            }}
          >
            {icon}
          </Box>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useGetDashboardStatsQuery()
  const firstName = user?.firstName ?? ''

  return (
    <div>
      <PageHeader title="Dashboard" />

      {firstName && (
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 4 }}>
          Welcome back, {firstName}!
        </Typography>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={String(stats?.totalContacts ?? 0)}
          icon={<PeopleIcon />}
          color="primary"
          loading={isLoading}
        />
        <StatCard
          label="Open Deals"
          value={String(stats?.openDeals ?? 0)}
          icon={<HandshakeIcon />}
          color="secondary"
          loading={isLoading}
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(stats?.pipelineValue ?? 0)}
          icon={<EuroIcon />}
          color="success"
          loading={isLoading}
        />
        <StatCard
          label="Activities Due"
          value={String(stats?.activitiesDue ?? 0)}
          icon={<EventNoteIcon />}
          color="warning"
          loading={isLoading}
        />
      </div>
    </div>
  )
}
