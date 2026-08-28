-- ============================================================
-- Training Planner – schema completo para proyecto nuevo
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop en orden inverso (foreign keys)
drop table if exists public.training_plan_weeks cascade;
drop table if exists public.training_plans cascade;
drop table if exists public.payments cascade;
drop table if exists public.alumnos cascade;

-- ============================================================
-- 1. Alumnos
-- ============================================================
create table public.alumnos (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamp with time zone default now() not null,
  created_by       uuid references auth.users(id) not null,
  first_name       text not null,
  last_name        text not null,
  email            text,
  phone            text,
  date_of_birth    date,
  -- Edad cargada a mano: el entrenador suele saberla sin saber la fecha exacta
  -- de nacimiento, así que las dos columnas se completan por separado.
  age              int check (age is null or age between 1 and 120),
  weight_kg        numeric(5,2) check (weight_kg is null or weight_kg between 20 and 300),
  city             text,
  -- Texto libre: medio del que dispone, tiempo disponible y días que entrena.
  available_medium text,
  available_time   text,
  training_days    text,
  -- Marcas referenciales, tal cual las escribe el entrenador ("21:40", "1h58").
  pb_5k            text,
  pb_10k           text,
  pb_21k           text,
  pb_42k           text,
  -- Objetivos: array de {name, target_time, achieved_time}. Van en jsonb y no
  -- en su propia tabla porque sólo se leen y escriben junto con el alumno.
  objectives       jsonb default '[]'::jsonb not null
                     check (jsonb_typeof(objectives) = 'array'),
  goal             text,
  notes            text,
  rhythm_notes     text,
  active           boolean default true not null
);

alter table public.alumnos enable row level security;

create policy "alumnos_select" on public.alumnos for select to authenticated
  using ((select auth.uid()) = created_by);
create policy "alumnos_insert" on public.alumnos for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "alumnos_update" on public.alumnos for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "alumnos_delete" on public.alumnos for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================
-- 2. Planes de entrenamiento
-- ============================================================
create table public.training_plans (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamp with time zone default now() not null,
  alumno_id   uuid references public.alumnos(id) on delete cascade not null,
  created_by  uuid references auth.users(id) not null,
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  notes       text,
  active      boolean default true not null
);

alter table public.training_plans enable row level security;

create policy "plans_select" on public.training_plans for select to authenticated
  using ((select auth.uid()) = created_by);
create policy "plans_insert" on public.training_plans for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "plans_update" on public.training_plans for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "plans_delete" on public.training_plans for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ============================================================
-- 3. Semanas del plan
-- ============================================================
create table public.training_plan_weeks (
  id          uuid default gen_random_uuid() primary key,
  plan_id     uuid references public.training_plans(id) on delete cascade not null,
  week_number int not null,
  week_start  date not null,
  monday      text,
  tuesday     text,
  wednesday   text,
  thursday    text,
  friday      text,
  saturday    text,
  sunday      text
);

alter table public.training_plan_weeks enable row level security;

create policy "weeks_select" on public.training_plan_weeks for select to authenticated
  using (
    exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid()))
  );
create policy "weeks_insert" on public.training_plan_weeks for insert to authenticated
  with check (
    exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid()))
  );
create policy "weeks_update" on public.training_plan_weeks for update to authenticated
  using (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())))
  with check (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())));
create policy "weeks_delete" on public.training_plan_weeks for delete to authenticated
  using (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())));

-- ============================================================
-- 4. Pagos mensuales
-- ============================================================
create table public.payments (
  id         uuid default gen_random_uuid() primary key,
  alumno_id  uuid references public.alumnos(id) on delete cascade not null,
  year       int not null,
  month      int not null check (month between 1 and 12),
  paid       boolean default false not null,
  -- Cómo se cobró. Los valores viven también en src/types/constants.ts
  -- (PAYMENT_METHODS); el check es la red del lado de la base.
  -- Null significa "cobrada antes de que existiera esta columna": las bases
  -- nuevas nunca lo tienen, pero el reporte lo sigue contemplando.
  method     text check (method is null or method in ('cash', 'transfer')),
  paid_at    timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  unique(alumno_id, year, month),
  -- Una cuota impaga no puede arrastrar un método: si no se cobró, no se cobró
  -- de ninguna manera. Sin esto, desmarcar dejaba un cobro fantasma contado en
  -- el reporte de métodos de pago.
  constraint payments_method_requires_paid check (paid or method is null)
);

alter table public.payments enable row level security;

create policy "payments_select" on public.payments for select to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));
create policy "payments_insert" on public.payments for insert to authenticated
  with check (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));
create policy "payments_update" on public.payments for update to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())))
  with check (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));
create policy "payments_delete" on public.payments for delete to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));

-- ============================================================
-- 5. Índices
-- Postgres no indexa las foreign keys solo. Sin esto, las políticas RLS
-- (que corren un `exists (...)` por fila) y todos los embeds resuelven con
-- sequential scan. Ver add_indexes.sql para el detalle.
-- payments(alumno_id) ya queda cubierto por unique(alumno_id, year, month).
-- ============================================================
create index if not exists alumnos_created_by_idx        on public.alumnos (created_by);
create index if not exists training_plans_alumno_id_idx  on public.training_plans (alumno_id);
create index if not exists training_plans_created_by_idx on public.training_plans (created_by);
create index if not exists training_plan_weeks_plan_id_idx on public.training_plan_weeks (plan_id);

-- El reporte de métodos de pago agrupa por `method` sobre las cuotas cobradas.
-- El índice parcial cubre esa lectura y deja fuera las impagas, que son las que
-- más se acumulan.
create index if not exists payments_method_idx on public.payments (method) where paid;

-- Sin semanas duplicadas dentro de un plan.
create unique index if not exists training_plan_weeks_plan_week_uniq
  on public.training_plan_weeks (plan_id, week_number);

-- ============================================================
-- 6. Funciones de escritura atómica (REQUERIDAS por la app)
-- Las Server Actions de planes escriben plan + semanas vía estas funciones,
-- para que un fallo a mitad de camino no deje el plan sin semanas.
-- El cuerpo vive en add_plan_rpc.sql: pegar y correr ESE archivo a
-- continuación de éste. Sin él, crear o editar planes falla.
-- ============================================================

-- ============================================================
-- 6b. Migraciones incrementales ya incorporadas acá arriba
-- Este archivo describe el esquema COMPLETO, así que una base creada con él no
-- necesita correr add_payment_method.sql (la columna `method`, sus checks y su
-- índice ya están en la tabla de arriba). Los archivos add_*.sql / fix_*.sql
-- existen para las bases que se construyeron de forma incremental.
--
-- La excepción es add_plan_rpc.sql (ver punto 6): ése SÍ hay que correrlo
-- siempre, junto con fix_empty_plan_weeks.sql, que lo reemplaza con el guard
-- que impide dejar un plan sin semanas.
-- ============================================================

-- ============================================================
-- 7. Usuario admin
-- Crear desde: Supabase Dashboard → Authentication → Users → Add user
-- Tildar "Auto Confirm User"
-- ============================================================
