import { baseApi } from './baseApi'

interface PipelineStageSummary {
  stage: string
  count: number
  totalValue: number
  avgProbability: number
  weightedValue: number
}

interface PipelineSummaryResponse {
  stages: PipelineStageSummary[]
  totals: {
    totalDeals: number
    totalValue: number
    totalWeightedValue: number
  }
}

interface RevenueMonth {
  month: string
  revenue: number
  count: number
}

interface ForecastMonth {
  month: string
  projectedRevenue: number
  totalValue: number
  count: number
}

interface RevenueForecastResponse {
  wonByMonth: RevenueMonth[]
  forecast: ForecastMonth[]
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  wonDeals: number
  totalRevenue: number
}

interface LeaderboardResponse {
  period: string
  leaderboard: LeaderboardEntry[]
}

interface DashboardStats {
  totalContacts: number
  openDeals: number
  pipelineValue: number
  activitiesDue: number
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/reports/dashboard',
      providesTags: [{ type: 'Report', id: 'dashboard' }],
    }),
    getPipelineSummary: builder.query<PipelineSummaryResponse, { pipelineId?: string }>({
      query: (params) => ({ url: '/reports/pipeline-summary', params }),
      providesTags: [{ type: 'Report', id: 'pipeline-summary' }],
    }),
    getRevenueForecast: builder.query<RevenueForecastResponse, { months?: number }>({
      query: (params) => ({ url: '/reports/revenue-forecast', params }),
      providesTags: [{ type: 'Report', id: 'revenue-forecast' }],
    }),
    getLeaderboard: builder.query<LeaderboardResponse, { period?: string }>({
      query: (params) => ({ url: '/reports/leaderboard', params }),
      providesTags: [{ type: 'Report', id: 'leaderboard' }],
    }),
  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetPipelineSummaryQuery,
  useGetRevenueForecastQuery,
  useGetLeaderboardQuery,
} = reportsApi
