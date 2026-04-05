'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createTransactionSchema } from '@/lib/validators'
import { getPeriodForDate } from '@/lib/period'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Closed-period error message in Spanish */
const CLOSED_PERIOD_ERROR =
  'El periodo de este mes esta cerrado. Reabre el periodo para agregar transacciones.'

/** Revalidate paths that display transaction data */
function revalidateTransactionPaths(): void {
  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/presupuesto')
}

/**
 * Creates a new transaction after validating input with Zod.
 * Resolves the period for the transaction date and enforces closed-period protection.
 */
export async function createTransaction(data: unknown): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const period = await getPeriodForDate(parsed.data.date)

    if (period.isClosed) {
      return { error: { _form: [CLOSED_PERIOD_ERROR] } }
    }

    await prisma.transaction.create({
      data: {
        type: parsed.data.type,
        amount: BigInt(parsed.data.amount),
        categoryId: parsed.data.categoryId,
        date: new Date(parsed.data.date),
        description: parsed.data.description ?? null,
        paymentMethod: parsed.data.paymentMethod ?? null,
        notes: parsed.data.notes ?? null,
        incomeSourceId: parsed.data.incomeSourceId ?? null,
        periodId: period.id,
      },
    })

    revalidateTransactionPaths()
    return { success: true }
  } catch (_error: unknown) {
    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Updates an existing transaction by ID.
 * Checks both the current period and the target period (if date changed) for closed status.
 */
export async function updateTransaction(id: string, data: unknown): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { period: true },
    })

    if (!existing) {
      return { error: { _form: ['Transaccion no encontrada'] } }
    }

    if (existing.period.isClosed) {
      return { error: { _form: [CLOSED_PERIOD_ERROR] } }
    }

    const newPeriod = await getPeriodForDate(parsed.data.date)

    if (newPeriod.isClosed) {
      return { error: { _form: [CLOSED_PERIOD_ERROR] } }
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        type: parsed.data.type,
        amount: BigInt(parsed.data.amount),
        categoryId: parsed.data.categoryId,
        date: new Date(parsed.data.date),
        description: parsed.data.description ?? null,
        paymentMethod: parsed.data.paymentMethod ?? null,
        notes: parsed.data.notes ?? null,
        incomeSourceId: parsed.data.incomeSourceId ?? null,
        periodId: newPeriod.id,
      },
    })

    revalidateTransactionPaths()
    return { success: true }
  } catch (_error: unknown) {
    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Deletes a transaction by ID.
 * Enforces closed-period protection before deletion.
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { period: true },
    })

    if (!existing) {
      return { error: { _form: ['Transaccion no encontrada'] } }
    }

    if (existing.period.isClosed) {
      return { error: { _form: [CLOSED_PERIOD_ERROR] } }
    }

    await prisma.transaction.delete({
      where: { id },
    })

    revalidateTransactionPaths()
    return { success: true }
  } catch (_error: unknown) {
    return { error: { _form: ['Error de servidor'] } }
  }
}
