'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { setPayment } from '@/modules/payments/actions'

interface PaymentToggleProps {
  alumnoId: string
  year: number
  month: number
  paid: boolean
  monthLabel?: string
}

export function PaymentToggle({
  alumnoId,
  year,
  month,
  paid: serverPaid,
  monthLabel,
}: PaymentToggleProps) {
  // useOptimistic, not useState: a useState initializer only runs on mount, so
  // once the server revalidated to a different value the button kept showing
  // the stale local one. This resolves back to the server's truth on its own.
  const [paid, setPaidOptimistic] = useOptimistic(serverPaid)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      setError(null)
      const next = !paid
      setPaidOptimistic(next)
      const result = await setPayment(alumnoId, year, month, next)
      // No manual revert needed — if the write failed the revalidation never
      // changed the prop, and the optimistic value falls back to it.
      if (result.error) setError(result.error)
    })
  }

  const label = monthLabel ?? (paid ? 'Pagó' : 'Sin pago')
  const tooltip = error ?? (paid ? `Desmarcar ${label} como pagado` : `Marcar ${label} como pagado`)

  return (
    <div className="group/tooltip relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60',
          paid
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-600 hover:bg-red-200',
          error && 'ring-2 ring-destructive',
        )}
      >
        {paid ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
        {label}
      </button>

      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100"
      >
        <div className="relative whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
          {tooltip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      </div>
    </div>
  )
}
