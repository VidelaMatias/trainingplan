'use client'

import Link from 'next/link'
import { CircleDollarSign } from 'lucide-react'

import { Pagination, usePagination } from '@/components/ui/pagination'
import { PaymentToggle } from '@/modules/payments/components/PaymentToggle'
import type { OwedMonth } from '@/modules/payments/utils'

// Vista plana armada en el servidor: el panel sólo pagina y renderiza.
export interface DebtorRow {
  id: string
  first_name: string
  last_name: string
  owed: OwedMonth[]
}

export function DebtorsPanel({ debtors }: { debtors: DebtorRow[] }) {
  const { page, pageCount, pageItems, total, from, to, setPage } = usePagination(debtors)

  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-800">
        <CircleDollarSign className="size-4" />
        Cuotas pendientes
      </h2>

      {/* El tope de alto es sólo de md para arriba: en mobile la página ya
          scrollea y un scroll anidado adentro del panel es peor que la lista
          entera (el paginado ya la deja en 10). El eje X va explícitamente
          oculto porque con overflow-y en auto el X pasa de visible a auto solo. */}
      <div className="divide-y divide-red-200/70 md:max-h-112 md:overflow-y-auto md:overflow-x-hidden md:pr-1">
        {pageItems.map((c) => (
          // Nombre y meses uno al lado del otro: separarlos con justify-between
          // los mandaba a los extremos del panel, con un vacío enorme al medio.
          // Con muchos meses la fila crece hacia abajo, así que cada alumno va
          // separado por una línea: si no, dos deudores con varias filas de
          // chips cada uno se leen como uno solo.
          <div
            key={c.id}
            className="flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0"
          >
            {/* shrink-0 para que el nombre no se parta en una palabra por
                renglón cuando los chips piden lugar; pt para que su línea de
                texto quede alineada con la del primer chip. */}
            <Link
              href={`/dashboard/clients/${c.id}`}
              className="max-w-full shrink-0 pt-0.5 text-sm font-medium wrap-break-word text-red-900 hover:underline"
            >
              {c.first_name} {c.last_name}
            </Link>
            {/* Los meses adeudados ya están en los botones, así que no se
                repiten arriba en texto. min-w-0 + flex-1: el bloque toma el
                ancho que sobra y hace wrap adentro, en lugar de estirar la fila
                y sacar el panel de la pantalla. */}
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {c.owed.map(({ year, month, label }) => (
                <PaymentToggle
                  key={`${year}-${month}`}
                  alumnoId={c.id}
                  year={year}
                  month={month}
                  paid={false}
                  // Un mes adeudado no tiene método por definición: el chip
                  // pregunta cuál al marcarlo.
                  method={null}
                  monthLabel={label}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        from={from}
        to={to}
        onPageChange={setPage}
        label="alumnos"
        className="border-t border-red-200 pt-3"
      />
    </div>
  )
}
