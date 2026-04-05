import PageHeader from '@/components/layout/PageHeader'
import DynamicIcon from '@/components/ui/DynamicIcon'

export default function IngresosPage() {
  return (
    <div>
      <PageHeader title="Ingresos" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="banknote"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg">
          Los ingresos se construiran en una fase posterior
        </p>
      </div>
    </div>
  )
}
