'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createCategorySchema } from '@/lib/validators'
import { requireAuth } from '@/lib/auth-utils'

type ActionResult = { success: true } | { error: Record<string, string[]> }

/** Helper to detect Prisma error codes from both real errors and test mocks */
function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code
  }
  return null
}

/** Revalidate paths that display category data */
function revalidateCategoryPaths(): void {
  revalidatePath('/configuracion')
  revalidatePath('/movimientos')
}

/**
 * Creates a new custom category after validating input with Zod.
 * Auto-increments sortOrder. Sets isDefault=false.
 * Catches P2002 (unique constraint on name) and returns Spanish error.
 */
export async function createCategory(data: unknown): Promise<ActionResult> {
  const parsed = createCategorySchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { userId } = await requireAuth()

  try {
    const maxSort = await prisma.category.aggregate({
      _max: { sortOrder: true },
    })

    const nextSortOrder = (maxSort._max.sortOrder ?? 0) + 1

    await prisma.category.create({
      data: {
        name: parsed.data.name,
        icon: parsed.data.icon,
        color: parsed.data.color,
        type: parsed.data.type,
        isDefault: false,
        sortOrder: nextSortOrder,
        userId,
      },
    })

    revalidateCategoryPaths()
    return { success: true }
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error)

    if (code === 'P2002') {
      return { error: { name: ['Ya existe una categoria con ese nombre'] } }
    }

    return { error: { _form: ['Error de servidor'] } }
  }
}

/**
 * Soft-deletes a category by setting isActive=false.
 * Refuses to delete default categories (isDefault=true).
 * Preserves transaction history by keeping the record.
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const { userId } = await requireAuth()

  try {
    const category = await prisma.category.findFirst({
      where: { id, userId },
      select: { isDefault: true },
    })

    if (!category) {
      return { error: { _form: ['Categoria no encontrada'] } }
    }

    if (category.isDefault) {
      return { error: { _form: ['No se pueden eliminar categorias predeterminadas'] } }
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    })

    revalidateCategoryPaths()
    return { success: true }
  } catch {
    return { error: { _form: ['Error de servidor'] } }
  }
}
