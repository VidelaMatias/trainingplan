@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind v4 · Zod v4 · Supabase (PostgreSQL + Auth) · ExcelJS · lucide-react

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run lint      # ESLint
```

## Development Workflow

**Before writing any code:**
1. Read the relevant existing files in the affected module.
2. Identify patterns already in use (component structure, naming, data-fetching approach).
3. Check for existing components or utilities that can be reused before creating new ones.
4. Never duplicate logic that already exists elsewhere.

**After every modification:**
1. Review the change for logic errors and edge cases.
2. Verify all imports resolve — no broken paths.
3. Run `npm run lint` and `npx tsc --noEmit`; both must be clean.
4. Check Server/Client Component boundaries: no server-only code in Client Components; `'use client'` only where interactivity requires it.

## Engineering Standards

- `strict: true` in tsconfig. No `any` — use `unknown` and narrow, or type explicitly. Explicit return types on exported functions.
- **Zod v4**: every Server Action input is validated with a schema from `src/types/schemas.ts`. Schemas are the single source of input truth.
- **ActionResult pattern** — every Server Action returns:
  ```ts
  type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
  ```
  Actions never throw to the client. The UI always handles both branches. Actions that finish by navigating call `redirect()` on success and return the error branch otherwise.
- **Module structure** — each domain is self-contained under `src/modules/<domain>/`:
  ```
  modules/<domain>/
    queries.ts      # read functions for Server Components (RLS-scoped, no user id needed)
    actions.ts      # Server Actions, all Zod-validated, ActionResult-returning
    utils.ts        # pure domain helpers (dates, derivations)
    components/      # UI components scoped to this domain
  ```
- **No direct Supabase calls in components** — always go through a module's `queries.ts` or `actions.ts`.
- **Auth guard**: Server Actions call `requireAuth()` from `src/lib/auth/guards.ts` for the user id and a friendly error; the database (RLS on `created_by`) is the authoritative boundary.
- **Ownership**: mutating actions re-check `created_by = auth.uid()` before writing.
- **Constants**: enum-like values and their Spanish UI metadata live in `src/types/constants.ts`. Never hard-code raw strings like `'active'` in logic.
- **Components**: Server Components by default. Forms use `useActionState` + a Server Action passed (or `.bind`-bound) as the `action` prop — not `useState + fetch`.
- **No barrel exports**: import directly from source files.

## UI & Styling

- **Tailwind v4** with CSS-based config in `src/app/globals.css` (no `tailwind.config.js`).
- Semantic color tokens (`primary`, `muted`, `border`, `destructive`, …) are defined in `globals.css` and map to the app's blue/slate palette. Prefer token utilities (`bg-primary`, `text-muted-foreground`, `border-border`) over raw palette classes in shared primitives.
- **Primitives** live in `src/components/ui/` (`Button`, `Input`, `Textarea`, `Label`, `Badge`, `Card`, `Spinner`), built with `cva` + the `cn()` helper (`src/lib/utils.ts`). Compose these instead of re-typing class strings. Style links-as-buttons with `buttonVariants(...)`.
- **Icons**: `lucide-react` components — no inline SVG.
- All code in English. UI labels/text in Spanish.

## Domain Overview

Training Planner (Diego Simon Trail Run) — a single running coach manages their athletes, weekly training plans, and monthly fees.

**Principal**: one authenticated trainer. Every table is row-level-scoped to `created_by`, so the app has no role system — RLS is the boundary.

**Alumno (client)**: an athlete. Carries a `rhythm_notes` free-text block (reference paces) that is auto-embedded into every exported plan.

**Training plan**: a titled block of one or more **weeks**. Each week is a 7-day grid (`monday`…`sunday`) of free-text sessions. `start_date` = first week's Monday; `end_date` = last week's Sunday. Status (`active` / `upcoming` / `expired`) is derived from those dates. Plans export to `.xlsx` via `app/api/plans/[planId]/export`.

**Payments**: one row per `(alumno, year, month)`. The dashboard and client views compute owed months from the alumno's signup date forward.

## Core Entities (DB tables)

| Table | Key fields |
|-------|-----------|
| `alumnos` | id, first_name, last_name, email, phone, date_of_birth, goal, notes, rhythm_notes, active, created_by, created_at |
| `training_plans` | id, alumno_id, created_by, title, start_date, end_date, notes, active, created_at |
| `training_plan_weeks` | id, plan_id, week_number, week_start, monday…sunday |
| `payments` | alumno_id, year, month, paid, paid_at |

## Folder Structure

```
src/
├── app/
│   ├── login/ forgot-password/ reset-password/   # public auth pages (Client)
│   ├── dashboard/                                 # protected shell + pages
│   │   ├── page.tsx                               # panel: stats, expiring plans, debtors
│   │   └── clients/                               # list, [id], [id]/edit, new, [id]/plans/…
│   └── api/plans/[planId]/export/route.ts         # Excel export route handler
├── components/
│   ├── ui/                                        # design-system primitives (cva + cn)
│   └── layout/                                    # Sidebar, MobileNav, nav-items
├── modules/                                       # domain logic
│   ├── auth/ clients/ plans/ payments/            # queries · actions · utils · components
├── lib/
│   ├── auth/guards.ts                             # requireAuth
│   ├── supabase/                                  # client.ts (browser) · server.ts (SSR) · middleware.ts
│   └── utils.ts                                   # cn()
└── types/
    ├── index.ts                                   # ActionResult + shared domain types
    ├── schemas.ts                                 # Zod schemas + inferred input types
    └── constants.ts                               # DAYS, PLAN_STATUS, badge metadata, defaults
```
