'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { BudgetVsSpent } from '@/types'
import { formatMoney } from '@/lib/utils'
import DynamicIcon from '@/components/ui/DynamicIcon'

export interface BudgetBarChartProps {
  data: BudgetVsSpent[]
}

const CHART_COLORS = {
  grid: '#222222',
  axis: '#666666',
  tooltipBg: '#141414',
  tooltipBorder: '#222222',
  budgetMuted: '#444444',
}

interface ChartDataPoint {
  name: string
  color: string
  budgetNum: number
  spentNum: number
  budgetStr: string
  spentStr: string
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
}) {
  if (!active || !payload?.[0]) return null

  const data = payload[0].payload
  const budgetNum = data.budgetNum
  const percentUsed = budgetNum > 0
    ? Math.round((data.spentNum / budgetNum) * 100)
    : 0

  return (
    <div
      className="rounded-lg border p-3 text-xs"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
      }}
    >
      <p className="font-medium text-text-primary mb-1">{data.name}</p>
      <p className="text-text-secondary">
        Presupuesto: {formatMoney(data.budgetStr)}
      </p>
      <p className="text-text-secondary">
        Gastado: {formatMoney(data.spentStr)}
      </p>
      <p className="text-text-muted mt-1">{percentUsed}% usado</p>
    </div>
  )
}

export default function BudgetBarChart({ data }: BudgetBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Presupuesto vs Gastado
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DynamicIcon
            name="bar-chart-3"
            size={32}
            className="text-text-muted mb-3"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm">
            Sin datos de presupuesto
          </p>
          <p className="text-text-muted text-xs mt-1">
            Configura tu presupuesto en la seccion de Presupuesto
          </p>
        </div>
      </div>
    )
  }

  const chartData: ChartDataPoint[] = data.map((d) => ({
    name: d.name,
    color: d.color,
    budgetNum: Number(d.budget) / 100,
    spentNum: Number(d.spent) / 100,
    budgetStr: d.budget,
    spentStr: d.spent,
  }))

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Presupuesto vs Gastado
      </h3>
      <ResponsiveContainer
        width="100%"
        height={Math.max(data.length * 50, 200)}
      >
        <BarChart data={chartData} layout="vertical" barGap={4}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            horizontal={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            width={100}
            axisLine={false}
            tickLine={false}
          />
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar
            dataKey="budgetNum"
            fill={CHART_COLORS.budgetMuted}
            radius={[0, 4, 4, 0]}
            barSize={12}
            name="Presupuesto"
          />
          <Bar
            dataKey="spentNum"
            radius={[0, 4, 4, 0]}
            barSize={12}
            name="Gastado"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
