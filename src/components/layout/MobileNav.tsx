'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import StatusDot from '@/components/ui/StatusDot'
import { MOBILE_TAB_ITEMS, MORE_MENU_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import MobileMoreSheet from './MobileMoreSheet'

/** Mobile bottom tab bar with icon-only items (4 nav + "Mas" overflow) */
export default function MobileNav() {
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  /** Highlight "Mas" tab when any of the MORE_MENU_ITEMS routes is active */
  const isMoreActive = MORE_MENU_ITEMS.some((item) => isActive(item.href))

  return (
    <>
      <nav
        aria-label="Navegacion principal"
        className={cn(
          'fixed bottom-0 inset-x-0 z-40 md:hidden',
          'flex h-16 items-center justify-around',
          'bg-surface border-t border-border-divider',
        )}
      >
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'min-w-[48px] min-h-[44px]',
                'text-text-secondary',
              )}
            >
              <DynamicIcon name={item.icon} size={20} aria-hidden="true" />
              {active && <StatusDot className="absolute -bottom-1" />}
            </Link>
          )
        })}

        {/* "Mas" overflow button */}
        <button
          type="button"
          data-testid="mas-button"
          onClick={() => setIsMoreOpen(true)}
          aria-label="Mas"
          className={cn(
            'relative flex flex-col items-center justify-center',
            'min-w-[48px] min-h-[44px]',
            'text-text-secondary',
          )}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          {isMoreActive && <StatusDot className="absolute -bottom-1" />}
        </button>
      </nav>

      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
      />
    </>
  )
}
