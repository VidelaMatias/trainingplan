-- ============================================================
-- Training Planner – full schema (safe to re-run via SQL editor)
-- ============================================================

-- 1. Alumnos
create table if not exists public.alumnos (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamp with time zone default now() not null,
  first_name    text not null,
  last_name     text not null,
  email         text unique,
  phone         text,
  date_of_birth date,
  goal          text,
  notes         text,
  rhythm_notes  text,
  active        boolean default true not null
);

alter table public.alumnos enable row level security;

create policy "alumnos_select" on public.alumnos for select to authenticated using (true);
create policy "alumnos_insert" on public.alumnos for insert to authenticated with check (true);
create policy "alumnos_update" on public.alumnos for update to authenticated using (true) with check (true);
create policy "alumnos_delete" on public.alumnos for delete to authenticated using (true);

-- 2. Planes de entrenamiento (un plan = un programa, puede tener múltiples semanas)
create table if not exists public.training_plans (
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

create policy "plans_select" on public.training_plans for select to authenticated using (true);
create policy "plans_insert" on public.training_plans for insert to authenticated
  with check ((select auth.uid()) = created_by);
create policy "plans_update" on public.training_plans for update to authenticated
  using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy "plans_delete" on public.training_plans for delete to authenticated
  using ((select auth.uid()) = created_by);

-- 3. Semanas del plan (cada plan tiene 1-N semanas, cada semana tiene Lun-Dom)
create table if not exists public.training_plan_weeks (
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

create policy "weeks_select" on public.training_plan_weeks for select to authenticated using (true);
create policy "weeks_insert" on public.training_plan_weeks for insert to authenticated
  with check (
    exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid()))
  );
create policy "weeks_update" on public.training_plan_weeks for update to authenticated
  using (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())))
  with check (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())));
create policy "weeks_delete" on public.training_plan_weeks for delete to authenticated
  using (exists (select 1 from public.training_plans where id = plan_id and created_by = (select auth.uid())));

-- 4. Pagos mensuales (1 registro por alumno/mes)
create table if not exists public.payments (
  id         uuid default gen_random_uuid() primary key,
  alumno_id  uuid references public.alumnos(id) on delete cascade not null,
  year       int not null,
  month      int not null,
  paid       boolean default false not null,
  paid_at    timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  unique(alumno_id, year, month)
);

alter table public.payments enable row level security;

create policy "payments_select" on public.payments for select to authenticated using (true);
create policy "payments_insert" on public.payments for insert to authenticated with check (true);
create policy "payments_update" on public.payments for update to authenticated using (true) with check (true);
create policy "payments_delete" on public.payments for delete to authenticated using (true);
