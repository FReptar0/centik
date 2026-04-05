'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createBudgetSchema } from '@/lib/validators'

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

  try {
    await Promise.all(
      parsed.data.entries.map((entry) =>
        prisma.budget.upsert({
          where: {
            periodId_categoryId: {
              periodId,
              categoryId: entry.categoryId,
            },
          },
          update: { quincenalAmount: BigInt(entry.quincenalAmount) },
          create: {
            periodId,
            categoryId: entry.categoryId,
            quincenalAmount: BigInt(entry.quincenalAmount),
          },
        }),
      ),
    )

    revalidateBudgetPaths()
    return { success: true }
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}
