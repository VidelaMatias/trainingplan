'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { setPayment } from '@/modules/payments/actions'
import {
  METHOD_META,
  PAYMENT_METHOD_CHIP,
  PAYMENT_METHOD_LIST,
  UNSPECIFIED_METHOD,
  type PaymentMethod,
} from '@/types/constants'

interface PaymentToggleProps {
  alumnoId: string
  year: number
  month: number
  paid: boolean
  method: PaymentMethod | null
  monthLabel?: string
}

export function PaymentToggle({
  alumnoId,
  year,
  month,
  paid: serverPaid,
  method: serverMethod,
  monthLabel,
}: PaymentToggleProps) {
  // useOptimistic, not useState: a useState initializer only runs on mount, so
  // once the server revalidated to a different value the button kept showing
  // the stale local one. This resolves back to the server's truth on its own.
  //
  // Paid and method move together — a fee cannot flip to paid in one render and
  // acquire its method in the next — so they share one optimistic value.
  const [state, setOptimistic] = useOptimistic({ paid: serverPaid, method: serverMethod })
  const [error, setError] = useState<string | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [pending, startTransition] = useTransition()

  const label = monthLabel ?? (state.paid ? 'Pagó' : 'Sin pago')

  function save(paid: boolean, method: PaymentMethod | null) {
    setChoosing(false)
    startTransition(async () => {
      setError(null)
      setOptimistic({ paid, method })
      const result = await setPayment(alumnoId, year, month, paid, method)
      // No manual revert needed — if the write failed the revalidation never
      // changed the prop, and the optimistic value falls back to it.
      if (result.error) setError(result.error)
    })
  }

  // Marcar exige elegir cómo se cobró, así que abre la elección en lugar de
  // guardar de una. Desmarcar sigue siendo un solo click: no hay nada que
  // preguntar sobre una cuota que no se cobró.
  function onChipClick() {
    if (state.paid) save(false, null)
    else setChoosing(true)
  }

  // El error de un intento anterior se muestra en las dos ramas. Antes vivía
  // sólo en la del chip: abrir la elección lo hacía desaparecer sin que nadie
  // lo descartara, y volvía a aparecer al cancelar.
  const alert = error && (
    <span
      role="alert"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-destructive px-2.5 py-1.5 text-xs text-white shadow-lg"
    >
      <AlertCircle className="mr-1 inline size-3 align-[-2px]" />
      {error}
    </span>
  )

  // La elección reemplaza al chip en el flujo en vez de flotar sobre él: los dos
  // contenedores que muestran estos chips (panel de deudores e historial de
  // cuotas) scrollean con overflow, y un popover absoluto se cortaba contra ese
  // borde. Al ocupar lugar, la grilla simplemente se reacomoda.
  //
  // No lleva estado disabled: `save` cierra la elección antes de arrancar la
  // transición, así que esta rama nunca se renderiza con una escritura en vuelo.
  if (choosing) {
    return (
      <div className="relative inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
        {alert}
        <span className="px-1 text-xs font-semibold text-secondary-foreground">{label}</span>
        {PAYMENT_METHOD_LIST.map((option) => {
          const { label: optionLabel, icon: Icon } = METHOD_META[option]
          return (
            <button
              key={option}
              type="button"
              onClick={() => save(true, option)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap transition',
                PAYMENT_METHOD_CHIP[option],
              )}
            >
              <Icon className="size-3 shrink-0" />
              {optionLabel}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setChoosing(false)}
          title="Cancelar"
          aria-label="Cancelar"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-slate-200 hover:text-secondary-foreground"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  // Sobre una cuota cobrada el ícono dice además cómo se cobró, que es el dato
  // que antes había que ir a buscar al reporte.
  const methodMeta = state.paid ? METHOD_META[state.method ?? UNSPECIFIED_METHOD] : null
  const ChipIcon = methodMeta?.icon ?? X

  // El tooltip describe lo que hace el click, no lo que hacía antes: sobre una
  // cuota impaga el click ya no marca nada, abre la elección de método. Decía
  // "Marcar agosto como pagado" mientras el aria-label del mismo botón decía
  // otra cosa.
  // El mes abre la frase en vez de quedar incrustado: MONTH_NAMES los escribe con
  // mayúscula inicial, y «Elegir cómo se cobró Agosto» dejaba una mayúscula a
  // mitad de oración que ningún estilo puede corregir.
  const tooltip = state.paid
    ? `${methodMeta?.label} · click para desmarcar`
    : `${label}: elegir cómo se cobró`

  return (
    <div className="group/tooltip relative inline-flex">
      {alert}
      <button
        type="button"
        onClick={onChipClick}
        disabled={pending}
        aria-label={tooltip}
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60',
          state.paid
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-600 hover:bg-red-200',
          error && 'ring-2 ring-destructive',
        )}
      >
        <ChipIcon className="size-3 shrink-0" />
        {label}
        {state.paid && <Check className="size-3 shrink-0 opacity-60" aria-hidden />}
      </button>

      {/* Como ayuda de hover existe sólo de md para arriba: en touch no hay
          hover, y aunque esté en opacity-0 el globo sigue ocupando lugar, así
          que su ancho —una sola línea de texto— estiraba el scroll horizontal de
          lo que lo contuviera. Cuando hay un error, lo tapa el alert de arriba. */}
      {!error && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 md:block">
          <div className="relative whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg">
            {tooltip}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  )
}
