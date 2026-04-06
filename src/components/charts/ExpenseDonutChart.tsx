'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoryExpense } from '@/types'
import { formatMoney } from '@/lib/utils'
import DynamicIcon from '@/components/ui/DynamicIcon'

export interface ExpenseDonutChartProps {
  data: CategoryExpense[]
}

const CHART_COLORS = {
  tooltipBg: '#0a0f1a',
  tooltipBorder: '#1e293b',
}

interface ChartDataPoint {
  name: string
  value: number
  color: string
  originalTotal: string
}

function CustomTooltip({
  active,
  payload,
  totalValue,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
  totalValue: number
}) {
  if (!active || !payload?.[0]) return null

  const data = payload[0].payload
  const percentage = totalValue > 0
    ? ((data.value / totalValue) * 100).toFixed(1)
    : '0.0'

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
        {formatMoney(data.originalTotal)}
      </p>
      <p className="text-text-muted mt-1">{percentage}%</p>
    </div>
  )
}

/** Center label rendered as SVG text in the donut hole */
function CenterLabel({
  viewBox,
  totalStr,
}: {
  viewBox?: { cx?: number; cy?: number }
  totalStr: string
}) {
  if (!viewBox?.cx || !viewBox?.cy) return null

  return (
    <text
      x={viewBox.cx}
      y={viewBox.cy}
      textAnchor="middle"
      dominantBaseline="central"
    >
      <tspan
        x={viewBox.cx}
        dy="-8"
        fill="#64748b"
        fontSize="11"
      >
        Total
      </tspan>
      <tspan
        x={viewBox.cx}
        dy="20"
        fill="#e2e8f0"
        fontSize="14"
        fontWeight="600"
      >
        {formatMoney(totalStr)}
      </tspan>
    </text>
  )
}

export default function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Distribucion de Gastos
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DynamicIcon
            name="pie-chart"
            size={32}
            className="text-text-muted mb-3"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm">Sin gastos este mes</p>
          <p className="text-text-muted text-xs mt-1">
            Registra movimientos para ver la distribucion
          </p>
        </div>
      </div>
    )
  }

  const chartData: ChartDataPoint[] = data.map((d) => ({
    name: d.name,
    value: Number(d.total) / 100,
    color: d.color,
    originalTotal: d.total,
  }))

  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0)
  const totalStr = data
    .reduce((sum, d) => sum + BigInt(d.total), BigInt(0))
    .toString()

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Distribucion de Gastos
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
            label={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            <CenterLabel totalStr={totalStr} />
          </Pie>
          <Tooltip
            content={<CustomTooltip totalValue={totalValue} />}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-text-secondary">{d.name}</span>
            <span className="text-xs tabular-nums text-text-muted">
              {formatMoney(d.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
