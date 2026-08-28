import { cn } from '@/lib/utils'
import { sharePercent, type MethodTotals } from '@/modules/payments/utils'
import { METHOD_BUCKETS, METHOD_META } from '@/types/constants'

// Sin librería de gráficos: la barra es un flex y cada porción crece según su
// cantidad. Los porcentajes se redondean por separado, así que la suma puede dar
// 99 o 101 — con `flex-grow` en lugar de anchos absolutos el sobrante se reparte
// solo y la barra siempre cierra.
//
// El orden y los colores salen de METHOD_BUCKETS/METHOD_META, los mismos que usa
// la leyenda: cuando el gris estaba escrito a mano acá y otra vez en el punto de
// la leyenda, cambiar uno dejaba la leyenda nombrando un color inexistente.
export function MethodSplitBar({
  totals,
  className,
  size = 'md',
}: {
  totals: MethodTotals
  className?: string
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  if (totals.total === 0) {
    return <div className={cn('w-full rounded-full bg-slate-100', height, className)} aria-hidden />
  }

  const summary = METHOD_BUCKETS.filter((bucket) => totals[bucket] > 0)
    .map((bucket) => `${totals[bucket]} ${METHOD_META[bucket].label.toLowerCase()}`)
    .join(', ')

  return (
    <div
      className={cn('flex w-full overflow-hidden rounded-full bg-slate-100', height, className)}
      role="img"
      aria-label={summary}
    >
      {METHOD_BUCKETS.map((bucket) =>
        totals[bucket] === 0 ? null : (
          <div
            key={bucket}
            className={METHOD_META[bucket].barClassName}
            style={{ flexGrow: totals[bucket], flexBasis: 0 }}
            title={`${METHOD_META[bucket].label}: ${totals[bucket]} de ${totals.total} (${sharePercent(totals[bucket], totals.total)}%)`}
          />
        ),
      )}
    </div>
  )
}
