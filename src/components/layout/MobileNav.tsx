'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import { MOBILE_TAB_ITEMS, MORE_MENU_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import MobileMoreSheet from './MobileMoreSheet'

/** Mobile bottom tab bar with 5 items (4 nav + "Mas" overflow) */
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
          'bg-surface-elevated border-t border-border-divider',
        )}
      >
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'min-w-[48px] min-h-[44px]',
                active ? 'text-accent' : 'text-text-secondary',
              )}
            >
              <DynamicIcon name={item.icon} size={20} aria-hidden="true" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* "Mas" overflow button */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-1',
            'min-w-[48px] min-h-[44px]',
            isMoreActive ? 'text-accent' : 'text-text-secondary',
          )}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span className="text-[10px] font-medium">Mas</span>
        </button>
      </nav>

      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
      />
    </>
  )
}
