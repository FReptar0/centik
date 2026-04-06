'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { deleteCategory } from '@/app/configuracion/actions'
import type { Category } from '@/types'

interface CategoryListProps {
  categories: Category[]
  onAdd: () => void
}

const TYPE_DISPLAY: Record<string, { label: string; className: string }> = {
  EXPENSE: { label: 'Gasto', className: 'bg-negative/15 text-negative' },
  INCOME: { label: 'Ingreso', className: 'bg-positive/15 text-positive' },
  BOTH: { label: 'Ambos', className: 'bg-info/15 text-info' },
}

export default function CategoryList({ categories, onAdd }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <DynamicIcon
          name="settings"
          size={48}
          className="text-text-muted mb-4"
          aria-hidden="true"
        />
        <p className="text-text-secondary text-lg mb-4">
          No hay categorias configuradas
        </p>
        <button
          onClick={onAdd}
          className="bg-accent text-bg-primary font-semibold rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-accent-hover"
        >
          Agregar categoria
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <CategoryRow key={category.id} category={category} />
      ))}
    </div>
  )
}

interface CategoryRowProps {
  category: Category
}

function CategoryRow({ category }: CategoryRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const typeInfo = TYPE_DISPLAY[category.type] ?? TYPE_DISPLAY.EXPENSE

  useEffect(() => {
    if (!confirmingDelete) return

    const timer = setTimeout(() => {
      setConfirmingDelete(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [confirmingDelete])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const result = await deleteCategory(category.id)
      if (result && 'error' in result) {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al eliminar', { duration: 5000 })
      } else {
        toast.success('Categoria eliminada')
      }
    } catch {
      toast.error('Error al eliminar', { duration: 5000 })
    }
    setDeleting(false)
    setConfirmingDelete(false)
  }, [category.id])

  const handleCancel = useCallback(() => {
    setConfirmingDelete(false)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border bg-bg-card p-4',
        'transition-all duration-200',
      )}
    >
      {/* Icon circle with category color at 15% opacity */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}26` }}
      >
        <DynamicIcon
          name={category.icon}
          size={18}
          style={{ color: category.color }}
        />
      </div>

      {/* Name + type badge */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{category.name}</p>
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wide',
            'px-1.5 py-0.5 rounded-sm inline-block mt-0.5',
            typeInfo.className,
          )}
        >
          {typeInfo.label}
        </span>
      </div>

      {/* Delete button (only for non-default categories) */}
      {!category.isDefault && (
        <div className="shrink-0">
          {confirmingDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Eliminar?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-negative font-semibold hover:text-negative/80 transition-colors duration-200"
              >
                Si
              </button>
              <button
                onClick={handleCancel}
                className="text-text-secondary font-semibold hover:text-text-primary transition-colors duration-200"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-2 text-text-muted transition-colors duration-200 hover:text-negative hover:bg-negative/10"
              aria-label="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
