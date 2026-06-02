'use client'

import { useState, useTransition } from 'react'
import { setPayment } from '@/app/dashboard/clients/actions'

interface PaymentToggleProps {
  alumnoId: string
  year: number
  month: number
  paid: boolean
  monthLabel?: string
}

export default function PaymentToggle({ alumnoId, year, month, paid: initialPaid, monthLabel }: PaymentToggleProps) {
  const [paid, setPaid] = useState(initialPaid)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const next = !paid
      setPaid(next)
      const result = await setPayment(alumnoId, year, month, next)
      if (result?.error) setPaid(!next)
    })
  }

  const label = monthLabel ?? (paid ? 'Pagó' : 'Sin pago')
  const tooltip = paid ? `Desmarcar ${label} como pagado` : `Marcar ${label} como pagado`

  return (
    <div className="relative group/tooltip inline-flex">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-60 whitespace-nowrap ${
          paid
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-600 hover:bg-red-200'
        }`}
      >
        {paid ? (
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {label}
      </button>

      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                      opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
        <div className="bg-slate-800 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      </div>
    </div>
  )
}
