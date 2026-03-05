'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Box, Card, CardContent, Grid, Typography } from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TouchAppIcon from '@mui/icons-material/TouchApp'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import type { ICampaignStats } from '@/types/campaign'

interface CampaignStatsProps {
  stats: ICampaignStats
}

interface StatCardProps {
  label: string
  value: number
  total: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, total, icon, color }: StatCardProps) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={700}>
          {value.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {pct}% of total
        </Typography>
      </CardContent>
    </Card>
  )
}

const PIE_COLORS = {
  sent: '#2563eb',
  opened: '#16a34a',
  clicked: '#9333ea',
  failed: '#dc2626',
  pending: '#d1d5db',
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  const { totalRecipients, sent, opened, clicked, failed } = stats
  const pending = Math.max(0, totalRecipients - sent - failed)

  const barData = [
    { name: 'Sent', value: sent, fill: PIE_COLORS.sent },
    { name: 'Opened', value: opened, fill: PIE_COLORS.opened },
    { name: 'Clicked', value: clicked, fill: PIE_COLORS.clicked },
    { name: 'Failed', value: failed, fill: PIE_COLORS.failed },
  ]

  const pieData = [
    { name: 'Sent', value: sent },
    { name: 'Opened', value: opened },
    { name: 'Clicked', value: clicked },
    { name: 'Failed', value: failed },
    { name: 'Pending', value: pending },
  ].filter((d) => d.value > 0)

  const pieColors = [
    PIE_COLORS.sent,
    PIE_COLORS.opened,
    PIE_COLORS.clicked,
    PIE_COLORS.failed,
    PIE_COLORS.pending,
  ]

  return (
    <Box>
      {/* Summary cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {totalRecipients.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard
            label="Sent"
            value={sent}
            total={totalRecipients}
            icon={<DoneAllIcon fontSize="small" />}
            color={PIE_COLORS.sent}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard
            label="Opened"
            value={opened}
            total={totalRecipients}
            icon={<OpenInNewIcon fontSize="small" />}
            color={PIE_COLORS.opened}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard
            label="Clicked"
            value={clicked}
            total={totalRecipients}
            icon={<TouchAppIcon fontSize="small" />}
            color={PIE_COLORS.clicked}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard
            label="Failed"
            value={failed}
            total={totalRecipients}
            icon={<ErrorOutlineIcon fontSize="small" />}
            color={PIE_COLORS.failed}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Bar chart */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Delivery Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} />
              <YAxis fontSize={12} tick={{ fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip formatter={(val: number) => val.toLocaleString()} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Grid>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <Grid item xs={12} md={5}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={index} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => val.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
