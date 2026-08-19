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
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamp with time zone default now() not null,
  created_by    uuid references auth.users(id) not null,
  first_name    text not null,
  last_name     text not null,
  email         text,
  phone         text,
  date_of_birth date,
  goal          text,
  notes         text,
  rhythm_notes  text,
  active        boolean default true not null
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
  paid_at    timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  unique(alumno_id, year, month)
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
-- 7. Usuario admin
-- Crear desde: Supabase Dashboard → Authentication → Users → Add user
-- Tildar "Auto Confirm User"
-- ============================================================
