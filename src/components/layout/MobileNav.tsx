'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { cn } from '@/lib/utils'
import { logout } from '@/modules/auth/actions'
import { NAV_ITEMS, isNavActive } from '@/components/layout/nav-items'
import { NavIcon } from '@/components/layout/NavIcon'

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition',
              active ? 'text-primary' : 'text-muted-foreground hover:text-secondary-foreground',
            )}
          >
            <NavIcon icon={Icon} className="size-6" />
            {item.label}
          </Link>
        )
      })}
      <form action={logout} className="flex-1">
        <button
          type="submit"
          className="flex h-full w-full flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-secondary-foreground"
        >
          <LogOut className="size-6" />
          Salir
        </button>
      </form>
    </nav>
  )
}
