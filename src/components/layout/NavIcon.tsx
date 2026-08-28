'use client'

import { useLinkStatus } from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

// El ícono de un ítem de navegación, que se convierte en spinner mientras la
// pantalla destino viaja.
//
// loading.tsx ya cubre el hueco una vez que el router arrancó la transición,
// pero si el prefetch todavía no terminó —celular, primera visita, red lenta—
// entre el click y el esqueleto hay un rato en que la app se ve congelada.
// Esto llena ese rato, que es justamente el caso que la doc de useLinkStatus
// marca como el suyo.
//
// Tiene que ser descendiente de un <Link> para que useLinkStatus lo vea.
export function NavIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus()

  // Ícono y spinner apilados en la misma celda de grid: ocupan exactamente el
  // mismo lugar, así que el cambio no mueve ni un píxel del ítem. Montar el
  // spinner recién al hacer click sí movía el label.
  //
  // El delay va atado a `pending`, no a cuál de los dos se está mostrando. Con
  // el delay puesto sobre el que aparece, el ícono se iba de inmediato y el
  // spinner recién entraba a los 300ms: entre medio el ítem quedaba vacío —
  // justo el hueco de "la app parece congelada" que esto viene a tapar.
  //
  // Ahora los dos esperan 300ms al entrar en pending: hasta ahí no cambia nada
  // (una navegación ya prefetcheada resuelve antes y el spinner nunca llega a
  // verse), y a los 300ms hacen un cross-fade. Al volver, delay-0 en ambos, para
  // que el spinner no siga girando después de que la pantalla ya cambió.
  const swap = (visible: boolean) =>
    cn(
      'col-start-1 row-start-1 size-full transition-opacity duration-150',
      visible ? 'opacity-100' : 'opacity-0',
      pending ? 'delay-300' : 'delay-0',
    )

  return (
    <span className={cn('grid shrink-0 place-items-center', className)}>
      <Icon className={swap(!pending)} aria-hidden />
      {/* El Spinner trae role="status": tapado para lectores de pantalla
          mientras no hay nada cargando, si no anuncia "Cargando" siempre. */}
      <span className={swap(pending)} aria-hidden={!pending}>
        <Spinner className="size-full" />
      </span>
    </span>
  )
}
