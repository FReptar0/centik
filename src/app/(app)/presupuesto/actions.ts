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

  // Phase 30.1 T-30.1-IDOR-001: period ownership guard (Phase 27 pattern)
  const period = await prisma.period.findFirst({
    where: { id: periodId, userId },
    select: { id: true },
  })
  if (!period) {
    return { error: { _form: ['Periodo no encontrado'] } }
  }

  // Phase 30.1 T-30.1-IDOR-002: batched category ownership guard. Empty-entries
  // rejection is already handled by createBudgetSchema (Zod) earlier in the function.
  const submittedCategoryIds = parsed.data.entries.map((e) => e.categoryId)
  const ownedCategories = await prisma.category.findMany({
    where: { id: { in: submittedCategoryIds }, userId },
    select: { id: true },
  })
  if (ownedCategories.length !== submittedCategoryIds.length) {
    return { error: { _form: ['Categoria no encontrada'] } }
  }

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
