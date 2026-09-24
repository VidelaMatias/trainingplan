'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}): React.JSX.Element {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-96 flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-red-100">
        <AlertTriangle className="size-7 text-red-600" />
      </div>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Algo salió mal</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Ocurrió un error al cargar esta sección. Podés intentar de nuevo.
      </p>
      {/* unstable_retry y no reset: reset sólo vuelve a renderizar lo que ya
          llegó, y un error del servidor (una lectura que falló) vuelve igual.
          Con staleTimes, además, esa respuesta con error puede quedar en el
          cache del cliente: retry la vuelve a pedir. */}
      <Button onClick={() => unstable_retry()}>
        <RotateCw />
        Reintentar
      </Button>
    </div>
  )
}
