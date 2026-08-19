import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Module resolution hook for `node --test`.
//
// Node runs the .ts sources directly via --experimental-strip-types, but it
// does not read tsconfig, so two things the app's imports rely on have to be
// re-implemented here:
//
//   1. the "@/*" -> "./src/*" path alias
//   2. extensionless specifiers ("@/lib/date"), which the bundler resolves but
//      Node does not
//
// Nothing here affects the app build — Turbopack does its own resolution.

const SRC = pathToFileURL(new URL('../src/', import.meta.url).pathname).href

function withExtension(url) {
  if (/\.[a-z]+$/i.test(url)) return url
  if (existsSync(new URL(`${url}.ts`))) return `${url}.ts`
  if (existsSync(new URL(`${url}.tsx`))) return `${url}.tsx`
  if (existsSync(new URL(`${url}/index.ts`))) return `${url}/index.ts`
  return url
}

export function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    return next(withExtension(SRC + specifier.slice(2)), context)
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    return next(withExtension(new URL(specifier, context.parentURL).href), context)
  }
  return next(specifier, context)
}
