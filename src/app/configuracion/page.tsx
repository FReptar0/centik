import PageHeader from '@/components/layout/PageHeader'
import DynamicIcon from '@/components/ui/DynamicIcon'

export default function ConfiguracionPage() {
  return (
    <div>
      <PageHeader title="Configuracion" />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="settings"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg">Proximamente</p>
      </div>
    </div>
  )
}
