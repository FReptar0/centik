'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import DynamicIcon from '@/components/ui/DynamicIcon'
import StatusDot from '@/components/ui/StatusDot'
import { SIDEBAR_NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/actions/auth'

/** Desktop/tablet sidebar navigation with responsive collapse */
export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30',
        'hidden md:flex md:w-16 lg:w-60',
        'flex-col bg-surface border-r border-border-divider',
      )}
    >
      {/* App name header */}
      <div className="px-4 pt-6 pb-4">
        {/* Desktop: full name */}
        <span className="hidden lg:block text-xl font-bold text-accent">
          Centik
        </span>
        {/* Tablet: single letter */}
        <span className="block lg:hidden text-xl font-bold text-accent text-center">
          C
        </span>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
        {SIDEBAR_NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'group relative flex items-center rounded-lg py-2.5 text-sm font-medium',
                'transition-all duration-200',
                'md:justify-center md:px-0 lg:justify-start lg:gap-3 lg:px-3',
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
              )}
            >
              <DynamicIcon name={item.icon} size={18} aria-hidden="true" />
              {/* Label: hidden on tablet, visible on desktop */}
              <span className="hidden lg:inline">{item.label}</span>
              {/* StatusDot: desktop inline after label, tablet absolute next to icon */}
              {active && (
                <StatusDot
                  className={cn(
                    'lg:ml-auto',
                    'md:absolute md:-right-0.5 md:top-2.5',
                    'lg:relative lg:right-auto lg:top-auto',
                  )}
                />
              )}
              {/* Tooltip for tablet: visible on hover, hidden on desktop */}
              <span
                className={cn(
                  'absolute left-full ml-2 rounded-md bg-surface px-2 py-1',
                  'text-xs text-text-primary whitespace-nowrap',
                  'opacity-0 pointer-events-none',
                  'group-hover:opacity-100 lg:hidden',
                  'transition-opacity duration-200',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Logout button */}
      <div className="mt-auto px-2 lg:px-3 pb-4">
        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesion"
            className={cn(
              'group relative flex w-full items-center rounded-lg py-2.5 text-sm font-medium',
              'transition-all duration-200',
              'md:justify-center md:px-0 lg:justify-start lg:gap-3 lg:px-3',
              'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
            )}
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="hidden lg:inline">Cerrar sesion</span>
            {/* Tooltip for tablet */}
            <span
              className={cn(
                'absolute left-full ml-2 rounded-md bg-surface px-2 py-1',
                'text-xs text-text-primary whitespace-nowrap',
                'opacity-0 pointer-events-none',
                'group-hover:opacity-100 lg:hidden',
                'transition-opacity duration-200',
              )}
            >
              Cerrar sesion
            </span>
          </button>
        </form>
      </div>
    </aside>
  )
}
