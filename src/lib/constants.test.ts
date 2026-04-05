import { describe, it, expect } from 'vitest'
import { ICON_MAP } from '@/components/ui/DynamicIcon'
import {
  DEFAULT_CATEGORIES,
  CATEGORY_COLORS,
  INCOME_SOURCE_TYPES,
  PAYMENT_METHODS_DISPLAY,
  FREQUENCY_DISPLAY,
  SIDEBAR_NAV_ITEMS,
  MOBILE_TAB_ITEMS,
  MORE_MENU_ITEMS,
  PERIOD_AWARE_ROUTES,
  MONTH_NAMES_ES,
} from './constants'

describe('DEFAULT_CATEGORIES', () => {
  it('has exactly 8 entries (6 expense + 2 income)', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(8)
  })

  it('has 6 expense categories', () => {
    const expense = DEFAULT_CATEGORIES.filter((c) => c.type === 'EXPENSE')
    expect(expense).toHaveLength(6)
  })

  it('has 2 income categories', () => {
    const income = DEFAULT_CATEGORIES.filter((c) => c.type === 'INCOME')
    expect(income).toHaveLength(2)
  })

  it('each category has name, icon, color, and type fields', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat).toHaveProperty('name')
      expect(cat).toHaveProperty('icon')
      expect(cat).toHaveProperty('color')
      expect(cat).toHaveProperty('type')
      expect(typeof cat.name).toBe('string')
      expect(typeof cat.icon).toBe('string')
      expect(typeof cat.color).toBe('string')
      expect(cat.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('contains expected category names', () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name)
    expect(names).toContain('Comida')
    expect(names).toContain('Servicios')
    expect(names).toContain('Entretenimiento')
    expect(names).toContain('Suscripciones')
    expect(names).toContain('Transporte')
    expect(names).toContain('Otros')
    expect(names).toContain('Empleo')
    expect(names).toContain('Freelance')
  })
})

describe('CATEGORY_COLORS', () => {
  it('has 8 color entries', () => {
    expect(Object.keys(CATEGORY_COLORS)).toHaveLength(8)
  })

  it('maps each category name to its hex color', () => {
    expect(CATEGORY_COLORS['Comida']).toBe('#fb923c')
    expect(CATEGORY_COLORS['Empleo']).toBe('#34d399')
    expect(CATEGORY_COLORS['Freelance']).toBe('#22d3ee')
  })
})

describe('INCOME_SOURCE_TYPES', () => {
  it('has 3 entries', () => {
    expect(INCOME_SOURCE_TYPES).toHaveLength(3)
  })

  it('contains EMPLOYMENT, FREELANCE, and OTHER', () => {
    expect(INCOME_SOURCE_TYPES).toContain('EMPLOYMENT')
    expect(INCOME_SOURCE_TYPES).toContain('FREELANCE')
    expect(INCOME_SOURCE_TYPES).toContain('OTHER')
  })
})

describe('PAYMENT_METHODS_DISPLAY', () => {
  it('has correct keys for all payment methods', () => {
    const keys = Object.keys(PAYMENT_METHODS_DISPLAY)
    expect(keys).toContain('EFECTIVO')
    expect(keys).toContain('DEBITO')
    expect(keys).toContain('CREDITO')
    expect(keys).toContain('TRANSFERENCIA')
    expect(keys).toHaveLength(4)
  })

  it('maps to Spanish display names', () => {
    expect(PAYMENT_METHODS_DISPLAY['EFECTIVO']).toBe('Efectivo')
    expect(PAYMENT_METHODS_DISPLAY['TRANSFERENCIA']).toBe('Transferencia')
  })
})

describe('FREQUENCY_DISPLAY', () => {
  it('has correct keys for all frequencies', () => {
    const keys = Object.keys(FREQUENCY_DISPLAY)
    expect(keys).toContain('QUINCENAL')
    expect(keys).toContain('MENSUAL')
    expect(keys).toContain('SEMANAL')
    expect(keys).toContain('VARIABLE')
    expect(keys).toHaveLength(4)
  })

  it('maps to Spanish display names', () => {
    expect(FREQUENCY_DISPLAY['QUINCENAL']).toBe('Quincenal')
    expect(FREQUENCY_DISPLAY['VARIABLE']).toBe('Variable')
  })
})

describe('SIDEBAR_NAV_ITEMS', () => {
  it('has 6 items', () => {
    expect(SIDEBAR_NAV_ITEMS).toHaveLength(6)
  })

  it('has correct labels in order', () => {
    const labels = SIDEBAR_NAV_ITEMS.map((item) => item.label)
    expect(labels).toEqual([
      'Inicio',
      'Movimientos',
      'Deudas',
      'Presupuesto',
      'Ingresos',
      'Historial',
    ])
  })

  it('has all icon names present in ICON_MAP', () => {
    for (const item of SIDEBAR_NAV_ITEMS) {
      expect(ICON_MAP[item.icon]).toBeDefined()
    }
  })
})

describe('MOBILE_TAB_ITEMS', () => {
  it('has 4 items', () => {
    expect(MOBILE_TAB_ITEMS).toHaveLength(4)
  })

  it('has all icon names present in ICON_MAP', () => {
    for (const item of MOBILE_TAB_ITEMS) {
      expect(ICON_MAP[item.icon]).toBeDefined()
    }
  })
})

describe('MORE_MENU_ITEMS', () => {
  it('has 3 items', () => {
    expect(MORE_MENU_ITEMS).toHaveLength(3)
  })

  it('has all icon names present in ICON_MAP', () => {
    for (const item of MORE_MENU_ITEMS) {
      expect(ICON_MAP[item.icon]).toBeDefined()
    }
  })
})

describe('PERIOD_AWARE_ROUTES', () => {
  it('contains exactly the 4 expected paths', () => {
    expect(PERIOD_AWARE_ROUTES).toEqual([
      '/',
      '/movimientos',
      '/presupuesto',
      '/historial',
    ])
  })
})

describe('MONTH_NAMES_ES', () => {
  it('has 12 entries', () => {
    expect(MONTH_NAMES_ES).toHaveLength(12)
  })

  it('starts with Enero and ends with Diciembre', () => {
    expect(MONTH_NAMES_ES[0]).toBe('Enero')
    expect(MONTH_NAMES_ES[11]).toBe('Diciembre')
  })
})
