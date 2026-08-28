'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code2, LogOut, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'
import { logout } from '@/modules/auth/actions'
import { NAV_ITEMS, isNavActive } from '@/components/layout/nav-items'
import { NavIcon } from '@/components/layout/NavIcon'

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Training</p>
            <p className="text-xs text-slate-400">Planner</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )}
            >
              <NavIcon icon={Icon} className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-700 px-3 py-4">
        <div className="mb-2 px-3 py-2">
          <p className="truncate text-xs text-slate-400">{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="size-5" />
            Cerrar sesión
          </button>
        </form>

        {/* Developer credit badge. The sidebar is a dark surface, so it uses the
            slate palette directly instead of the semantic tokens (which are
            light-theme only — see globals.css). */}
        <div className="mt-3 px-1">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
            <Code2 className="size-3 shrink-0" />
            <span>
              Desarrollado por <span className="font-semibold text-slate-200">MV Software</span>
            </span>
          </span>
        </div>
      </div>
    </aside>
  )
}
