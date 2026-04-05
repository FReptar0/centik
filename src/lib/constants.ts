import { CategoryType } from '@/types'

/** Default category definition for seed data and UI reference */
interface DefaultCategory {
  name: string
  icon: string
  color: string
  type: CategoryType
}

/**
 * Default expense and income categories matching seed data.
 * 6 expense categories + 2 income categories.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Comida', icon: 'utensils', color: '#fb923c', type: 'EXPENSE' },
  { name: 'Servicios', icon: 'zap', color: '#60a5fa', type: 'EXPENSE' },
  { name: 'Entretenimiento', icon: 'clapperboard', color: '#a78bfa', type: 'EXPENSE' },
  { name: 'Suscripciones', icon: 'smartphone', color: '#f472b6', type: 'EXPENSE' },
  { name: 'Transporte', icon: 'car', color: '#fbbf24', type: 'EXPENSE' },
  { name: 'Otros', icon: 'package', color: '#94a3b8', type: 'EXPENSE' },
  { name: 'Empleo', icon: 'briefcase', color: '#34d399', type: 'INCOME' },
  { name: 'Freelance', icon: 'laptop', color: '#22d3ee', type: 'INCOME' },
] as const

/** Maps category names to their hex color values */
export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((cat) => [cat.name, cat.color]),
)

/** Valid income source type values */
export const INCOME_SOURCE_TYPES = ['EMPLOYMENT', 'FREELANCE', 'OTHER'] as const

/** Spanish display names for PaymentMethod enum values */
export const PAYMENT_METHODS_DISPLAY: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Debito',
  CREDITO: 'Credito',
  TRANSFERENCIA: 'Transferencia',
} as const

/** Spanish display names for Frequency enum values */
export const FREQUENCY_DISPLAY: Record<string, string> = {
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
  SEMANAL: 'Semanal',
  VARIABLE: 'Variable',
} as const
