'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createDebtSchema, updateDebtBalanceSchema } from '@/lib/validators'
import { getDefaultUserId } from '@/lib/auth-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Helper to detect Prisma error codes from both real errors and test mocks */
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

/** Revalidate paths that display debt data */
function revalidateDebtPaths(): void {
  revalidatePath('/deudas')
  revalidatePath('/')
}

/**
 * Creates a new debt after validating input with Zod.
 * Converts string amounts to BigInt for database storage.
 * Catches P2002 (unique constraint on name) and returns Spanish error.
 */
export async function createDebt(data: unknown): Promise<ActionResult> {
  const parsed = createDebtSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const userId = await getDefaultUserId()
    await prisma.debt.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        currentBalance: BigInt(parsed.data.currentBalance),
        creditLimit: parsed.data.creditLimit ? BigInt(parsed.data.creditLimit) : null,
        annualRate: parsed.data.annualRate,
        minimumPayment: parsed.data.minimumPayment ? BigInt(parsed.data.minimumPayment) : null,
        monthlyPayment: parsed.data.monthlyPayment ? BigInt(parsed.data.monthlyPayment) : null,
        originalAmount: parsed.data.originalAmount ? BigInt(parsed.data.originalAmount) : null,
        remainingMonths: parsed.data.remainingMonths ?? null,
        cutOffDay: parsed.data.cutOffDay ?? null,
        paymentDueDay: parsed.data.paymentDueDay ?? null,
        userId,
      },
    })

    revalidateDebtPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2002') {
      return { error: { name: ['Ya existe una deuda con ese nombre'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Updates an existing debt by ID.
 * Catches P2025 (not found) and P2002 (duplicate name).
 */
export async function updateDebt(id: string, data: unknown): Promise<ActionResult> {
  const parsed = createDebtSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.debt.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        currentBalance: BigInt(parsed.data.currentBalance),
        creditLimit: parsed.data.creditLimit ? BigInt(parsed.data.creditLimit) : null,
        annualRate: parsed.data.annualRate,
        minimumPayment: parsed.data.minimumPayment ? BigInt(parsed.data.minimumPayment) : null,
        monthlyPayment: parsed.data.monthlyPayment ? BigInt(parsed.data.monthlyPayment) : null,
        originalAmount: parsed.data.originalAmount ? BigInt(parsed.data.originalAmount) : null,
        remainingMonths: parsed.data.remainingMonths ?? null,
        cutOffDay: parsed.data.cutOffDay ?? null,
        paymentDueDay: parsed.data.paymentDueDay ?? null,
      },
    })

    revalidateDebtPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2025') {
      return { error: { _form: ['Deuda no encontrada'] } }
    }

    if (code === 'P2002') {
      return { error: { name: ['Ya existe una deuda con ese nombre'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Updates only the balance of a debt (inline edit).
 * Uses updateDebtBalanceSchema for lightweight validation.
 * Catches P2025 (not found) for graceful error handling.
 */
export async function updateDebtBalance(id: string, data: unknown): Promise<ActionResult> {
  const parsed = updateDebtBalanceSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.debt.update({
      where: { id },
      data: { currentBalance: BigInt(parsed.data.currentBalance) },
    })

    revalidateDebtPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2025') {
      return { error: { _form: ['Deuda no encontrada'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Deletes a debt by ID.
 * Catches P2025 (not found) for graceful error handling.
 */
export async function deleteDebt(id: string): Promise<ActionResult> {
  try {
    await prisma.debt.delete({
      where: { id },
    })

    revalidateDebtPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2025') {
      return { error: { _form: ['Deuda no encontrada'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}
