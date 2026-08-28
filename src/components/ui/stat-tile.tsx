import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface StatTileProps {
  label: string
  value: number
  /** Cuando está, el tile entero es un link y aparece el chevron al hover. */
  href?: string
  /** Ícono a la izquierda de la etiqueta. */
  icon?: LucideIcon
  /** Dato secundario al lado del número, p. ej. "45%". */
  suffix?: string
  valueClassName?: string
  iconClassName?: string
  highlight?: 'amber' | 'red'
}

// El número es el titular; si el tile tiene href, seguirlo abre exactamente lo
// que ese número cuenta.
//
// Vive en components/ui y no en la página del panel porque el reporte de
// métodos de pago —a un click de distancia— tenía su propia copia con un
// mecanismo de color distinto, y las dos filas de tiles tenían que verse igual.
export function StatTile({
  label,
  value,
  href,
  icon: Icon,
  suffix,
  valueClassName,
  iconClassName,
  highlight,
}: StatTileProps) {
  const content = (
    <>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        {Icon && <Icon className={cn('size-3.5 shrink-0', iconClassName)} />}
        <span className="truncate">{label}</span>
        {href && (
          <ChevronRight
            className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100"
            aria-hidden
          />
        )}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1.5 md:mt-1">
        <span
          className={cn(
            'text-2xl font-bold text-slate-900 md:text-3xl',
            valueClassName,
            highlight === 'amber' && 'text-amber-600',
            highlight === 'red' && 'text-destructive',
          )}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{suffix}</span>
        )}
      </p>
    </>
  )

  const className = cn(
    // Más compactos en mobile: a p-5 los tiles empujaban todo el panel debajo
    // del pliegue antes de mostrar un solo dato.
    'block rounded-xl border p-3 md:p-5',
    highlight === 'amber' && 'border-amber-200 bg-amber-50',
    highlight === 'red' && 'border-red-200 bg-red-50',
    !highlight && 'border-border bg-card',
  )

  if (!href) return <div className={className}>{content}</div>

  return (
    <Link
      href={href}
      className={cn(
        className,
        'group transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        highlight === 'amber' && 'hover:border-amber-300',
        highlight === 'red' && 'hover:border-red-300',
        !highlight && 'hover:border-primary/40',
      )}
    >
      {content}
    </Link>
  )
}
