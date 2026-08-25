import { cn } from '@/lib/utils'
import { parseRhythmNotes } from '@/modules/clients/utils'

interface RhythmNotesProps {
  notes: string
  /** Clases por línea: cada pantalla elige tamaño y tipografía. */
  lineClassName?: string
  className?: string
}

// Mismo criterio de color que el Excel exportado: la etiqueta de cada ritmo en
// rojo subrayado y el valor en azul, para que la referencia se lea igual en la
// app que en la planilla que recibe el alumno.
export function RhythmNotes({ notes, lineClassName, className }: RhythmNotesProps) {
  const lines = parseRhythmNotes(notes)

  return (
    <div className={cn('space-y-0.5', className)}>
      {lines.map(({ label, value }, i) => (
        <p key={i} className={cn('text-xs', lineClassName)}>
          {label && <span className="font-semibold text-red-700 underline">{label}</span>}
          <span className="text-blue-700">{value}</span>
        </p>
      ))}
    </div>
  )
}
