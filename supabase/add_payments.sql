-- Migración: agregar tabla de pagos mensuales
-- Ejecutar en el SQL editor de Supabase
--
-- ⚠️ CORREGIDO (auditoría de seguridad): la versión original de este archivo
-- creaba las cuatro políticas como `using (true)` / `with check (true)`, lo que
-- dejaba los pagos de todos los entrenadores accesibles a cualquier usuario
-- autenticado. Si ya corriste la versión vieja, aplicá fix_payments_rls.sql.

create table if not exists public.payments (
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

-- Scoped por dueño del alumno: un pago sólo es visible/mutable por el
-- entrenador que creó al alumno al que pertenece.
drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;

create policy "payments_select" on public.payments for select to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));

create policy "payments_insert" on public.payments for insert to authenticated
  with check (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));

create policy "payments_update" on public.payments for update to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())))
  with check (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));

create policy "payments_delete" on public.payments for delete to authenticated
  using (exists (select 1 from public.alumnos where id = alumno_id and created_by = (select auth.uid())));
