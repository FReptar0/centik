import PageHeader from '@/components/layout/PageHeader'
import PeriodSelector from '@/components/layout/PeriodSelector'
import KPIGrid from '@/components/dashboard/KPIGrid'
import BudgetBarChart from '@/components/charts/BudgetBarChart'
import ExpenseDonutChart from '@/components/charts/ExpenseDonutChart'
import TrendAreaChart from '@/components/charts/TrendAreaChart'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import { getCurrentPeriod, getPeriodForDate } from '@/lib/period'
import {
  getDashboardKPIs,
  getCategoryExpenses,
  getBudgetVsSpent,
  getMonthlyTrend,
  getRecentTransactions,
} from '@/lib/dashboard'

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams

  const period = params.month && params.year
    ? await getPeriodForDate(
        `${params.year}-${String(params.month).padStart(2, '0')}-01`,
      )
    : await getCurrentPeriod()

  const [kpis, categoryExpenses, budgetVsSpent, trend, recentTransactions] =
    await Promise.all([
      getDashboardKPIs(period.id),
      getCategoryExpenses(period.id),
      getBudgetVsSpent(period.id),
      getMonthlyTrend(),
      getRecentTransactions(period.id),
    ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inicio"
        periodSelector={<PeriodSelector isClosed={period.isClosed} />}
        closedBanner={period.isClosed}
      />

      <KPIGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BudgetBarChart data={budgetVsSpent} />
        <ExpenseDonutChart data={categoryExpenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendAreaChart data={trend} />
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  )
}
