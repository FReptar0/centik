import { CategoryType, Frequency, DebtType } from '../generated/prisma/client'

// --- Category seed data (DFR 2.3) ---

export const CATEGORIES = [
  { name: 'Comida', icon: 'utensils', color: '#fb923c', type: CategoryType.EXPENSE, sortOrder: 1 },
  { name: 'Servicios', icon: 'zap', color: '#60a5fa', type: CategoryType.EXPENSE, sortOrder: 2 },
  {
    name: 'Entretenimiento',
    icon: 'clapperboard',
    color: '#a78bfa',
    type: CategoryType.EXPENSE,
    sortOrder: 3,
  },
  {
    name: 'Suscripciones',
    icon: 'smartphone',
    color: '#f472b6',
    type: CategoryType.EXPENSE,
    sortOrder: 4,
  },
  { name: 'Transporte', icon: 'car', color: '#fbbf24', type: CategoryType.EXPENSE, sortOrder: 5 },
  { name: 'Otros', icon: 'package', color: '#94a3b8', type: CategoryType.EXPENSE, sortOrder: 6 },
  { name: 'Empleo', icon: 'briefcase', color: '#34d399', type: CategoryType.INCOME, sortOrder: 7 },
  { name: 'Freelance', icon: 'laptop', color: '#22d3ee', type: CategoryType.INCOME, sortOrder: 8 },
] as const

// --- Budget amounts per expense category (quincenal, in centavos) ---

export const BUDGET_AMOUNTS: Record<string, bigint> = {
  Comida: BigInt('200000'),
  Servicios: BigInt('100000'),
  Entretenimiento: BigInt('75000'),
  Suscripciones: BigInt('50000'),
  Transporte: BigInt('60000'),
  Otros: BigInt('40000'),
}

// --- Income source definitions ---

export const INCOME_SOURCES = [
  {
    name: 'TerSoft (Empleo)',
    defaultAmount: BigInt('2500000'),
    frequency: Frequency.QUINCENAL,
    type: 'EMPLOYMENT',
  },
  {
    name: 'Freelance',
    defaultAmount: BigInt('1500000'),
    frequency: Frequency.VARIABLE,
    type: 'FREELANCE',
  },
] as const

// --- Debt definitions ---

export const DEBTS = [
  {
    name: 'Tarjeta Nu',
    type: DebtType.CREDIT_CARD,
    currentBalance: BigInt('1500000'),
    creditLimit: BigInt('5000000'),
    annualRate: 4500,
    minimumPayment: BigInt('75000'),
    cutOffDay: 15,
    paymentDueDay: 5,
  },
  {
    name: 'Prestamo Personal',
    type: DebtType.PERSONAL_LOAN,
    currentBalance: BigInt('8000000'),
    originalAmount: BigInt('12000000'),
    annualRate: 2400,
    monthlyPayment: BigInt('350000'),
    remainingMonths: 24,
  },
] as const

// --- Value unit definitions ---

export const VALUE_UNITS = [
  {
    code: 'MXN',
    name: 'Peso Mexicano',
    precision: 2,
    symbol: '$',
    refreshInterval: 0,
  },
  {
    code: 'UDI',
    name: 'Unidad de Inversion',
    precision: 6,
    symbol: 'UDI',
    providerUrl: 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SP68257/datos/oportuno',
    providerPath: '$.bmx.series[0].datos[0].dato',
    providerHeaders: { 'Bmx-Token': 'BANXICO_API_TOKEN' },
    refreshInterval: 24,
  },
  {
    code: 'UMA',
    name: 'Unidad de Medida y Actualizacion',
    precision: 2,
    symbol: 'UMA',
    refreshInterval: 8760,
  },
] as const

// --- Monthly summary for March 2026 ---

export const MARCH_SUMMARY = {
  totalIncome: BigInt('5000000'),
  totalExpenses: BigInt('3200000'),
  totalSavings: BigInt('1800000'),
  savingsRate: 3600,
  debtAtClose: BigInt('9500000'),
  debtPayments: BigInt('425000'),
}

// --- Unit rate seed data ---

export const UNIT_RATES = {
  udi: {
    date: new Date('2026-04-03'),
    rateToMxnCents: BigInt('829'),
    rateRaw: '8.290000',
    source: 'manual',
  },
  uma: {
    date: new Date('2026-01-01'),
    rateToMxnCents: BigInt('11340'),
    rateRaw: '113.40',
    source: 'manual',
  },
}
