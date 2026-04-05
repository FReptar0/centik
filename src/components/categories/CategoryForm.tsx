'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { cn } from '@/lib/utils'
import { createCategory } from '@/app/configuracion/actions'

interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
}

/** Preset icons available for custom categories */
const PRESET_ICONS = [
  'utensils',
  'home',
  'receipt',
  'shopping-cart',
  'heart',
  'graduation-cap',
  'plane',
  'gift',
  'coffee',
  'dumbbell',
  'pill',
  'zap',
  'smartphone',
  'car',
  'clapperboard',
  'package',
] as const

/** Preset colors available for custom categories */
const PRESET_COLORS = [
  '#fb923c',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#94a3b8',
  '#34d399',
  '#22d3ee',
  '#8b5cf6',
  '#ef4444',
] as const

export default function CategoryForm({ isOpen, onClose }: CategoryFormProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva categoria">
      {isOpen && (
        <CategoryFormContent key="new-category" onClose={onClose} />
      )}
    </Modal>
  )
}

interface FormContentProps {
  onClose: () => void
}

/** Inner form component that remounts via key for clean state */
function CategoryFormContent({ onClose }: FormContentProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})

    const payload = {
      name: name.trim(),
      icon,
      color,
      type: 'EXPENSE' as const,
    }

    const result = await createCategory(payload)

    setSubmitting(false)

    if ('success' in result) {
      onClose()
    } else {
      setErrors(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field */}
      <div>
        <label
          htmlFor="category-name"
          className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5"
        >
          Nombre
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Mascotas"
          className={cn(
            'w-full rounded-lg border bg-bg-input px-3 py-2.5 text-sm text-text-primary',
            'placeholder:text-text-muted',
            'transition-colors duration-200',
            'focus:outline-none focus:border-border-focus focus:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
            errors.name ? 'border-negative' : 'border-border',
          )}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-negative">{errors.name[0]}</p>
        )}
      </div>

      {/* Icon selector */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Icono
        </span>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_ICONS.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => setIcon(iconName)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5',
                'transition-all duration-200',
                icon === iconName
                  ? 'bg-accent/15 border-accent ring-1 ring-accent'
                  : 'bg-bg-input border-border hover:border-border-light',
              )}
            >
              <DynamicIcon
                name={iconName}
                size={20}
                className={cn(
                  icon === iconName ? 'text-accent' : 'text-text-secondary',
                )}
              />
              <span
                className={cn(
                  'text-[10px] truncate max-w-full',
                  icon === iconName ? 'text-accent' : 'text-text-muted',
                )}
              >
                {iconName}
              </span>
            </button>
          ))}
        </div>
        {errors.icon && (
          <p className="mt-1 text-xs text-negative">{errors.icon[0]}</p>
        )}
      </div>

      {/* Color selector */}
      <div>
        <span className="block text-xs font-medium text-text-secondary tracking-wide uppercase mb-1.5">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setColor(hex)}
              className={cn(
                'h-8 w-8 rounded-full transition-all duration-200',
                color === hex
                  ? 'ring-2 ring-offset-2 ring-offset-bg-primary ring-accent'
                  : 'hover:scale-110',
              )}
              style={{ backgroundColor: hex }}
              aria-label={`Color ${hex}`}
            />
          ))}
        </div>
        {errors.color && (
          <p className="mt-1 text-xs text-negative">{errors.color[0]}</p>
        )}
      </div>

      {/* Form-level errors */}
      {errors._form && (
        <p className="text-xs text-negative">{errors._form[0]}</p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-bg-primary',
          'transition-colors duration-200',
          'hover:bg-accent-hover',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {submitting ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
