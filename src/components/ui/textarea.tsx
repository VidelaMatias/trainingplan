import * as React from 'react'

import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Mismo motivo que en Input: por debajo de 16px, iOS hace zoom al
        // enfocar y la página queda escalada.
        'w-full rounded-lg border border-input bg-card px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground transition outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm',
        className,
      )}
      {...props}
    />
  )
}
