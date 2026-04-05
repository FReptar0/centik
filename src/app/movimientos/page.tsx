import PageHeader from '@/components/layout/PageHeader'
import PeriodSelector from '@/components/layout/PeriodSelector'
import DynamicIcon from '@/components/ui/DynamicIcon'

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function MovimientosPage({ searchParams }: PageProps) {
  await searchParams

  return (
    <div>
      <PageHeader title="Movimientos" periodSelector={<PeriodSelector />} />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="arrow-left-right"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg">
          Los movimientos se construiran en una fase posterior
        </p>
      </div>
    </div>
  )
}
