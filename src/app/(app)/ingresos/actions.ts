'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createIncomeSourceSchema } from '@/lib/validators'
import { getDefaultUserId } from '@/lib/auth-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Helper to detect Prisma error codes from both real errors and test mocks */
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

/** Revalidate paths that display income source data */
function revalidateIncomePaths(): void {
  revalidatePath('/ingresos')
  revalidatePath('/')
}

/**
 * Creates a new income source after validating input with Zod.
 * Catches P2002 (unique constraint on name) and returns Spanish error.
 */
export async function createIncomeSource(data: unknown): Promise<ActionResult> {
  const parsed = createIncomeSourceSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    const userId = await getDefaultUserId()
    await prisma.incomeSource.create({
      data: {
        name: parsed.data.name,
        defaultAmount: BigInt(parsed.data.defaultAmount),
        frequency: parsed.data.frequency,
        type: parsed.data.type,
        userId,
      },
    })

    revalidateIncomePaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2002') {
      return { error: { name: ['Ya existe una fuente con ese nombre'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Updates an existing income source by ID.
 * Catches P2025 (not found) and P2002 (duplicate name).
 */
export async function updateIncomeSource(id: string, data: unknown): Promise<ActionResult> {
  const parsed = createIncomeSourceSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  try {
    await prisma.incomeSource.update({
      where: { id },
      data: {
        name: parsed.data.name,
        defaultAmount: BigInt(parsed.data.defaultAmount),
        frequency: parsed.data.frequency,
        type: parsed.data.type,
      },
    })

    revalidateIncomePaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2025') {
      return { error: { _form: ['Fuente de ingreso no encontrada'] } }
    }

    if (code === 'P2002') {
      return { error: { name: ['Ya existe una fuente con ese nombre'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Deletes an income source by ID.
 * Catches P2025 (not found) for graceful error handling.
 */
export async function deleteIncomeSource(id: string): Promise<ActionResult> {
  try {
    await prisma.incomeSource.delete({
      where: { id },
    })

    revalidateIncomePaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2025') {
      return { error: { _form: ['Fuente de ingreso no encontrada'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}
