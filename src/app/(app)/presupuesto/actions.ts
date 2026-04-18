'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createBudgetSchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Revalidate paths that display budget data */
function revalidateBudgetPaths(): void {
  revalidatePath('/presupuesto')
  revalidatePath('/')
}

/**
 * Upserts budget entries for a given period.
 * Each entry targets the (periodId, categoryId) unique composite.
 * Validates input with createBudgetSchema before processing.
 */
export async function upsertBudgets(periodId: string, data: unknown): Promise<ActionResult> {
  const parsed = createBudgetSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { userId } = await requireAuth()

  try {
    await Promise.all(
      parsed.data.entries.map(async (entry) => {
        const existing = await prisma.budget.findFirst({
          where: { periodId, categoryId: entry.categoryId, userId },
        })

        if (existing) {
          await prisma.budget.update({
            where: { id: existing.id },
            data: { quincenalAmount: BigInt(entry.quincenalAmount) },
          })
        } else {
          await prisma.budget.create({
            data: {
              periodId,
              categoryId: entry.categoryId,
              quincenalAmount: BigInt(entry.quincenalAmount),
              userId,
            },
          })
        }
      }),
    )

    revalidateBudgetPaths()
    return { success: true }
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}
