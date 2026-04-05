import { z } from 'zod'
import {
  TransactionType,
  Frequency,
  DebtType,
  PaymentMethod,
  CategoryType,
  AssetCategory,
} from '@/types'

// Set Spanish as fallback locale for unspecified error messages
z.config(z.locales.es())

// Shared regex: non-negative integer string (centavos / basis points)
const amountRegex = /^\d+$/

/** Validates POST /api/transactions request body */
export const createTransactionSchema = z.object({
  type: z.enum(TransactionType, {
    error: 'El tipo debe ser INCOME o EXPENSE',
  }),
  amount: z
    .string({ error: 'El monto es requerido' })
    .regex(amountRegex, {
      error: 'El monto debe ser un numero entero no negativo en centavos',
    }),
  categoryId: z.string({ error: 'La categoria es requerida' }),
  date: z.iso.date({ error: 'La fecha debe tener formato YYYY-MM-DD' }),
  description: z.string().optional(),
  paymentMethod: z
    .enum(PaymentMethod, { error: 'Metodo de pago no valido' })
    .optional(),
  notes: z.string().optional(),
  incomeSourceId: z.string().optional(),
})

/** Validates POST /api/debts request body */
export const createDebtSchema = z
  .object({
    name: z
      .string({ error: 'El nombre es requerido' })
      .min(1, { error: 'El nombre no puede estar vacio' }),
    type: z.enum(DebtType, { error: 'Tipo de deuda no valido' }),
    currentBalance: z
      .string({ error: 'El saldo actual es requerido' })
      .regex(amountRegex, {
        error: 'El saldo debe ser un numero entero no negativo en centavos',
      }),
    creditLimit: z
      .string()
      .regex(amountRegex, {
        error: 'El limite de credito debe ser en centavos',
      })
      .optional(),
    annualRate: z
      .number({ error: 'La tasa anual es requerida' })
      .int({ error: 'La tasa anual debe ser un entero' })
      .nonnegative({
        error: 'La tasa anual debe ser un entero no negativo en basis points',
      }),
    minimumPayment: z.string().regex(amountRegex).optional(),
    monthlyPayment: z.string().regex(amountRegex).optional(),
    originalAmount: z.string().regex(amountRegex).optional(),
    remainingMonths: z.number().int().nonnegative().optional(),
    cutOffDay: z.number().int().min(1).max(31).optional(),
    paymentDueDay: z.number().int().min(1).max(31).optional(),
  })
  .refine(
    (data) => data.type !== 'CREDIT_CARD' || data.creditLimit !== undefined,
    {
      error: 'El limite de credito es requerido para tarjetas de credito',
      path: ['creditLimit'],
    }
  )

/** Validates PUT /api/debts/[id] balance update */
export const updateDebtBalanceSchema = z.object({
  currentBalance: z
    .string({ error: 'El saldo actual es requerido' })
    .regex(amountRegex, {
      error: 'El saldo debe ser un numero entero no negativo en centavos',
    }),
})

/** Validates POST /api/budgets request body */
export const createBudgetSchema = z.object({
  entries: z
    .array(
      z.object({
        categoryId: z.string({ error: 'La categoria es requerida' }),
        quincenalAmount: z
          .string({ error: 'El monto quincenal es requerido' })
          .regex(amountRegex, {
            error:
              'El monto quincenal debe ser un numero entero no negativo en centavos',
          }),
      })
    )
    .min(1, { error: 'El presupuesto debe tener al menos una entrada' }),
})

/** Validates POST /api/income-sources request body */
export const createIncomeSourceSchema = z.object({
  name: z
    .string({ error: 'El nombre es requerido' })
    .min(1, { error: 'El nombre no puede estar vacio' }),
  defaultAmount: z
    .string({ error: 'El monto por defecto es requerido' })
    .regex(amountRegex, {
      error:
        'El monto por defecto debe ser un numero entero no negativo en centavos',
    }),
  frequency: z.enum(Frequency, { error: 'Frecuencia no valida' }),
  type: z
    .string({ error: 'El tipo es requerido' })
    .min(1, { error: 'El tipo no puede estar vacio' }),
})

/** Validates POST /api/categories request body */
export const createCategorySchema = z.object({
  name: z
    .string({ error: 'El nombre es requerido' })
    .min(1, { error: 'El nombre no puede estar vacio' }),
  icon: z
    .string({ error: 'El icono es requerido' })
    .min(1, { error: 'El icono no puede estar vacio' }),
  color: z
    .string({ error: 'El color es requerido' })
    .regex(/^#[0-9a-fA-F]{6}$/, {
      error: 'El color debe ser un codigo hexadecimal valido (ej: #8b5cf6)',
    }),
  type: z.enum(CategoryType, { error: 'Tipo de categoria no valido' }),
})

/** Validates POST /api/assets request body */
export const createAssetSchema = z.object({
  name: z
    .string({ error: 'El nombre es requerido' })
    .min(1, { error: 'El nombre no puede estar vacio' }),
  unitId: z.string({ error: 'La unidad de valor es requerida' }),
  amount: z
    .string({ error: 'El monto es requerido' })
    .regex(amountRegex, {
      error: 'El monto debe ser un numero entero no negativo',
    }),
  category: z.enum(AssetCategory, {
    error: 'Categoria de activo no valida',
  }),
  institution: z.string().optional(),
  notes: z.string().optional(),
})

/** Validates POST /api/units request body */
export const createValueUnitSchema = z.object({
  code: z
    .string({ error: 'El codigo es requerido' })
    .min(1, { error: 'El codigo no puede estar vacio' }),
  name: z
    .string({ error: 'El nombre es requerido' })
    .min(1, { error: 'El nombre no puede estar vacio' }),
  precision: z
    .number({ error: 'La precision es requerida' })
    .int({ error: 'La precision debe ser un entero' })
    .nonnegative({ error: 'La precision debe ser no negativa' }),
  providerUrl: z.string().optional(),
  providerPath: z.string().optional(),
  refreshInterval: z.number().int().nonnegative().optional(),
})
