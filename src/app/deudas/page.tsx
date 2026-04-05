import PageHeader from '@/components/layout/PageHeader'
import DynamicIcon from '@/components/ui/DynamicIcon'

export default function DeudasPage() {
  return (
    <div>
      <PageHeader title="Deudas" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="credit-card"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg">
          Las deudas se construiran en una fase posterior
        </p>
      </div>
    </div>
  )
}
