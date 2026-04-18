'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import CategoryList from '@/components/categories/CategoryList'
import CategoryForm from '@/components/categories/CategoryForm'
import type { Category } from '@/types'

interface ConfiguracionClientWrapperProps {
  categories: Category[]
}

export default function ConfiguracionClientWrapper({ categories }: ConfiguracionClientWrapperProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)

  function handleAdd() {
    setIsFormOpen(true)
  }

  function handleClose() {
    setIsFormOpen(false)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Configuracion"
        action={
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
          >
            <Plus size={16} />
            Agregar categoria
          </button>
        }
      />

      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Categorias</h2>
        <CategoryList categories={categories} onAdd={handleAdd} />
      </section>

      <CategoryForm isOpen={isFormOpen} onClose={handleClose} />
    </div>
  )
}
