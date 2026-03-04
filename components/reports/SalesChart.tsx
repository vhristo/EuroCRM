'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'

interface ChartDataItem {
  name: string
  value: number
  value2?: number
}

interface SalesChartProps {
  data: ChartDataItem[]
  title?: string
  barKey?: string
  barKey2?: string
  barColor?: string
  barColor2?: string
  currency?: string
  height?: number
}

export default function SalesChart({
  data,
  barKey = 'value',
  barKey2,
  barColor = '#2563eb',
  barColor2 = '#7c3aed',
  currency = 'EUR',
  height = 300,
}: SalesChartProps) {
  const formatTooltip = (val: number) => formatCurrency(val, currency)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} />
        <YAxis
          fontSize={12}
          tick={{ fill: '#6b7280' }}
          tickFormatter={(val: number) => formatCurrency(val, currency)}
        />
        <Tooltip formatter={formatTooltip} />
        <Legend />
        <Bar
          dataKey={barKey}
          fill={barColor}
          radius={[4, 4, 0, 0]}
          name="Revenue"
        />
        {barKey2 && (
          <Bar
            dataKey={barKey2}
            fill={barColor2}
            radius={[4, 4, 0, 0]}
            name="Projected"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
