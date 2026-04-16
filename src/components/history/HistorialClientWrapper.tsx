'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import YearSelector from './YearSelector'
import AnnualPivotTable from './AnnualPivotTable'
import CloseConfirmationModal from './CloseConfirmationModal'
import { MONTH_NAMES_ES } from '@/lib/constants'
import {
  closePeriod,
  reopenPeriod,
  getClosePeriodPreviewAction,
} from '@/app/historial/actions'
import type { MonthSummarySlot, ClosePeriodPreview } from '@/lib/history'

interface PeriodInfo {
  id: string
  month: number
  year: number
  isClosed: boolean
}

interface HistorialClientWrapperProps {
  initialYear: number
  availableYears: number[]
  data: MonthSummarySlot[]
  periods: PeriodInfo[]
  currentPeriodId: string | null
}

/** Client wrapper managing year navigation, close modal, and reopen actions */
export default function HistorialClientWrapper({
  initialYear,
  availableYears,
  data,
  periods,
  currentPeriodId,
}: HistorialClientWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentYear = Number(searchParams.get('year')) || initialYear

  // Close modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [selectedYear, setSelectedYear] = useState(0)
  const [preview, setPreview] = useState<ClosePeriodPreview | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const handleYearChange = useCallback(
    (year: number) => {
      router.replace(`/historial?year=${year}`)
    },
    [router],
  )

  const handleCloseClick = useCallback(
    async (periodId: string, month: number, year: number) => {
      setSelectedPeriodId(periodId)
      setSelectedMonth(month)
      setSelectedYear(year)
      setPreview(null)
      setIsModalOpen(true)

      // Load preview data
      const previewData = await getClosePeriodPreviewAction(periodId)
      setPreview(previewData)
    },
    [],
  )

  const handleConfirmClose = useCallback(async () => {
    if (!selectedPeriodId) return
    setIsClosing(true)

    const result = await closePeriod(selectedPeriodId)

    setIsClosing(false)
    setIsModalOpen(false)

    if ('success' in result) {
      toast.success('Periodo cerrado')
      router.refresh()
    } else {
      const messages = Object.values(result.error).flat()
      toast.error(messages[0] ?? 'Error al cerrar periodo', { duration: 5000 })
    }
  }, [selectedPeriodId, router])

  const handleModalClose = useCallback(() => {
    if (!isClosing) {
      setIsModalOpen(false)
    }
  }, [isClosing])

  const handleReopenClick = useCallback(
    async (periodId: string) => {
      const result = await reopenPeriod(periodId)
      if ('success' in result) {
        toast.success('Periodo reabierto')
        router.refresh()
      } else {
        const messages = Object.values(result.error).flat()
        toast.error(messages[0] ?? 'Error al reabrir periodo', { duration: 5000 })
      }
    },
    [router],
  )

  return (
    <div className="max-w-7xl">
      <PageHeader title="Historial" />

      <div className="mb-6 flex justify-center">
        <YearSelector
          currentYear={currentYear}
          availableYears={availableYears}
          onYearChange={handleYearChange}
        />
      </div>

      <AnnualPivotTable
        data={data}
        currentPeriodId={currentPeriodId}
        onCloseClick={handleCloseClick}
        onReopenClick={handleReopenClick}
        periods={periods}
      />

      <CloseConfirmationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleConfirmClose}
        isLoading={isClosing}
        monthName={MONTH_NAMES_ES[selectedMonth - 1] ?? ''}
        year={selectedYear}
        preview={preview}
      />
    </div>
  )
}
