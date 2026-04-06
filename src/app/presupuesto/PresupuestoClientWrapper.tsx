'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import PeriodSelector from '@/components/layout/PeriodSelector'
import BudgetTable from '@/components/budgets/BudgetTable'
import BudgetProgressList from '@/components/budgets/BudgetProgressList'
import BudgetSummaryRow from '@/components/budgets/BudgetSummaryRow'
import { upsertBudgets } from './actions'
import { reopenPeriod } from '@/app/historial/actions'
import type { BudgetWithSpent } from '@/lib/budget-shared'

interface PresupuestoClientWrapperProps {
  budgets: BudgetWithSpent[]
  quincenalIncome: string
  periodId: string
  isClosed: boolean
}

export default function PresupuestoClientWrapper({
  budgets,
  quincenalIncome,
  periodId,
  isClosed,
}: PresupuestoClientWrapperProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleReopen() {
    await reopenPeriod(periodId)
    router.refresh()
  }

  const handleSave = useCallback(
    async (entries: { categoryId: string; quincenalAmount: string }[]) => {
      setError(null)
      const result = await upsertBudgets(periodId, { entries })
      if ('error' in result) {
        const messages = Object.values(result.error).flat()
        setError(messages[0] ?? 'Error al guardar')
      }
    },
    [periodId],
  )

  return (
    <div>
      <PageHeader
        title="Presupuesto"
        periodSelector={<PeriodSelector isClosed={isClosed} />}
        closedBanner={isClosed}
        reopenAction={
          isClosed ? (
            <button
              type="button"
              onClick={handleReopen}
              className="flex items-center gap-1.5 text-sm text-info hover:text-info/80 underline underline-offset-2 transition-colors duration-200"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reabrir periodo
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">Configuracion</h2>
          <BudgetSummaryRow budgets={budgets} quincenalIncome={quincenalIncome} />
          <BudgetTable budgets={budgets} onSave={handleSave} isClosed={isClosed} />
          {error && (
            <p className="text-sm text-negative">{error}</p>
          )}
        </div>

        {/* Right: Progress */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary">Avance del Mes</h2>
          <BudgetProgressList budgets={budgets} />
        </div>
      </div>
    </div>
  )
}
