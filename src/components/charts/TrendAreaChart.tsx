'use client'

import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyTrendPoint } from '@/types'
import { formatMoney } from '@/lib/utils'
import { MONTH_NAMES_ES } from '@/lib/constants'
import DynamicIcon from '@/components/ui/DynamicIcon'

export interface TrendAreaChartProps {
  data: MonthlyTrendPoint[]
}

const CHART_COLORS = {
  axis: '#666666',
  tooltipBg: '#141414',
  tooltipBorder: 'none',
  positive: '#00E676',
  negative: '#FF3333',
}

interface ChartDataPoint {
  label: string
  monthName: string
  incomeNum: number
  expensesNum: number
  incomeStr: string
  expensesStr: string
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

  return (
    <div
      className="rounded-md border-0 p-3 text-xs"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
      }}
    >
      <p className="font-medium text-text-primary mb-1">{data.monthName}</p>
      <p className="font-mono" style={{ color: CHART_COLORS.positive }}>
        Ingresos: {formatMoney(data.incomeStr)}
      </p>
      <p className="font-mono" style={{ color: CHART_COLORS.negative }}>
        Gastos: {formatMoney(data.expensesStr)}
      </p>
    </div>
  )
}

export default function TrendAreaChart({ data }: TrendAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Tendencia 6 Meses
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DynamicIcon
            name="trending-up"
            size={32}
            className="text-text-tertiary mb-3"
            aria-hidden="true"
          />
          <p className="text-text-secondary text-sm">
            Sin datos de tendencia
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            Los datos aparecen al cerrar periodos mensuales
          </p>
        </div>
      </div>
    )
  }

  const chartData: ChartDataPoint[] = data.map((d) => ({
    label: MONTH_NAMES_ES[d.month - 1].slice(0, 3),
    monthName: `${MONTH_NAMES_ES[d.month - 1]} ${d.year}`,
    incomeNum: Number(d.totalIncome) / 100,
    expensesNum: Number(d.totalExpenses) / 100,
    incomeStr: d.totalIncome,
    expensesStr: d.totalExpenses,
  }))

  return (
    <div className="bg-surface-elevated rounded-lg p-5">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Tendencia 6 Meses
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={CHART_COLORS.positive}
                stopOpacity={0.12}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS.positive}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={CHART_COLORS.negative}
                stopOpacity={0.12}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS.negative}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="incomeNum"
            stroke={CHART_COLORS.positive}
            strokeWidth={1.5}
            fill="url(#incomeGradient)"
            name="Ingresos"
            dot={{ r: 2, fill: CHART_COLORS.positive, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: CHART_COLORS.positive, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expensesNum"
            stroke={CHART_COLORS.negative}
            strokeWidth={1.5}
            fill="url(#expensesGradient)"
            name="Gastos"
            dot={{ r: 2, fill: CHART_COLORS.negative, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: CHART_COLORS.negative, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.positive }}
          />
          <span className="text-xs text-text-secondary">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.negative }}
          />
          <span className="text-xs text-text-secondary">Gastos</span>
        </div>
      </div>
    </div>
  )
}
