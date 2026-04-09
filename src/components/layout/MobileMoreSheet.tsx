'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { MORE_MENU_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface MobileMoreSheetProps {
  isOpen: boolean
  onClose: () => void
}

/** Slide-up sheet for mobile "Mas" overflow items */
export default function MobileMoreSheet({
  isOpen,
  onClose,
}: MobileMoreSheetProps) {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 md:hidden',
          'bg-surface-elevated rounded-t-xl border-t border-border-divider',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu adicional"
      >
        {/* Drag handle indicator */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 bg-border-divider" />
        </div>

        {/* Menu items */}
        <nav className="px-4 pb-8">
          {MORE_MENU_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3',
                  'text-sm font-medium transition-all duration-200',
                  active
                    ? 'text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                )}
              >
                <DynamicIcon name={item.icon} size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
