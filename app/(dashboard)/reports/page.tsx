'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import SalesChart from '@/components/reports/SalesChart'
import {
  useGetPipelineSummaryQuery,
  useGetRevenueForecastQuery,
  useGetLeaderboardQuery,
} from '@/store/api/reportsApi'
import { formatCurrency } from '@/utils/formatters'

export default function ReportsPage() {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('month')

  const { data: pipelineData, isLoading: pipelineLoading } = useGetPipelineSummaryQuery({})
  const { data: forecastData, isLoading: forecastLoading } = useGetRevenueForecastQuery({ months: 6 })
  const { data: leaderboardData, isLoading: leaderboardLoading } = useGetLeaderboardQuery({ period: leaderboardPeriod })

  const pipelineChartData = pipelineData?.stages.map((s) => ({
    name: s.stage,
    value: s.totalValue,
    value2: s.weightedValue,
  })) ?? []

  const revenueChartData = [
    ...(forecastData?.wonByMonth.map((m) => ({
      name: m.month,
      value: m.revenue,
    })) ?? []),
  ]

  return (
    <div className="p-6">
      <PageHeader title="Reports" />

      <Grid container spacing={3} className="mt-2">
        {/* Pipeline Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Pipeline Summary</Typography>
              {pipelineLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <Typography variant="h4" color="primary">
                        {pipelineData?.totals.totalDeals ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Open Deals</Typography>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <Typography variant="h4" sx={{ color: '#16a34a' }}>
                        {formatCurrency(pipelineData?.totals.totalValue ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Total Value</Typography>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <Typography variant="h4" sx={{ color: '#7c3aed' }}>
                        {formatCurrency(pipelineData?.totals.totalWeightedValue ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Weighted Value</Typography>
                    </div>
                  </div>
                  <SalesChart
                    data={pipelineChartData}
                    barKey="value"
                    barKey2="value2"
                    height={350}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Revenue (Won Deals)</Typography>
              {forecastLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : (
                <SalesChart data={revenueChartData} barColor="#16a34a" height={300} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Forecast */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Revenue Forecast</Typography>
              {forecastLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : forecastData?.forecast.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Deals</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">Projected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {forecastData.forecast.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">{formatCurrency(row.totalValue)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.projectedRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary">No forecast data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Leaderboard */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6">Sales Leaderboard</Typography>
                <ToggleButtonGroup
                  value={leaderboardPeriod}
                  exclusive
                  onChange={(_e, val) => val && setLeaderboardPeriod(val)}
                  size="small"
                >
                  <ToggleButton value="week">Week</ToggleButton>
                  <ToggleButton value="month">Month</ToggleButton>
                  <ToggleButton value="quarter">Quarter</ToggleButton>
                  <ToggleButton value="year">Year</ToggleButton>
                </ToggleButtonGroup>
              </div>
              {leaderboardLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : leaderboardData?.leaderboard.length ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Won Deals</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboardData.leaderboard.map((entry) => (
                      <TableRow key={entry.userId}>
                        <TableCell>
                          <Chip
                            label={`#${entry.rank}`}
                            size="small"
                            color={entry.rank <= 3 ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <Typography variant="body2" fontWeight={600}>{entry.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{entry.email}</Typography>
                          </div>
                        </TableCell>
                        <TableCell align="right">{entry.wonDeals}</TableCell>
                        <TableCell align="right">{formatCurrency(entry.totalRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary">No data for this period</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}
