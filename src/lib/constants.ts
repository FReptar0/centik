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
  { name: 'Comida', icon: 'utensils', color: '#C88A5A', type: 'EXPENSE' },
  { name: 'Servicios', icon: 'zap', color: '#7A9EC4', type: 'EXPENSE' },
  { name: 'Entretenimiento', icon: 'clapperboard', color: '#9B89C4', type: 'EXPENSE' },
  { name: 'Suscripciones', icon: 'smartphone', color: '#C48AA3', type: 'EXPENSE' },
  { name: 'Transporte', icon: 'car', color: '#C4A84E', type: 'EXPENSE' },
  { name: 'Otros', icon: 'package', color: '#8A9099', type: 'EXPENSE' },
  { name: 'Empleo', icon: 'briefcase', color: '#6BAF8E', type: 'INCOME' },
  { name: 'Freelance', icon: 'laptop', color: '#7AACB8', type: 'INCOME' },
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

/** Navigation item definition for sidebar and mobile nav */
export interface NavItem {
  label: string
  href: string
  icon: string
  periodAware?: boolean
}

/** Desktop sidebar navigation items (6 items) */
export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: 'layout-dashboard', periodAware: true },
  {
    label: 'Movimientos',
    href: '/movimientos',
    icon: 'arrow-left-right',
    periodAware: true,
  },
  { label: 'Deudas', href: '/deudas', icon: 'credit-card' },
  {
    label: 'Presupuesto',
    href: '/presupuesto',
    icon: 'piggy-bank',
    periodAware: true,
  },
  { label: 'Ingresos', href: '/ingresos', icon: 'banknote' },
  {
    label: 'Historial',
    href: '/historial',
    icon: 'history',
    periodAware: true,
  },
]

/** Mobile bottom tab bar items (4 items; 5th "Mas" handled in MobileNav) */
export const MOBILE_TAB_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: 'layout-dashboard' },
  { label: 'Movimientos', href: '/movimientos', icon: 'arrow-left-right' },
  { label: 'Deudas', href: '/deudas', icon: 'credit-card' },
  { label: 'Presupuesto', href: '/presupuesto', icon: 'piggy-bank' },
]

/** "Mas" overflow menu items for mobile nav */
export const MORE_MENU_ITEMS: NavItem[] = [
  { label: 'Ingresos', href: '/ingresos', icon: 'banknote' },
  { label: 'Historial', href: '/historial', icon: 'history' },
  { label: 'Configuracion', href: '/configuracion', icon: 'settings' },
]

/** Routes where the period selector should appear */
export const PERIOD_AWARE_ROUTES = [
  '/',
  '/movimientos',
  '/presupuesto',
  '/historial',
]

/** Spanish month names for period display (i18n-ready) */
export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const
