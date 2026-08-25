import * as React from 'react'

import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 16px en mobile: Safari de iOS hace zoom al enfocar un campo con letra
        // más chica, y deja la página escalada al salir. De sm para arriba
        // vuelve al text-sm del diseño.
        'h-10 w-full rounded-lg border border-input bg-card px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm',
        className,
      )}
      {...props}
    />
  )
}
