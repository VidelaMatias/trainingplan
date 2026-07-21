-- ============================================================
-- FIX DE SEGURIDAD — RLS de public.payments
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema: add_payments.sql creó las cuatro políticas de payments como
-- `using (true)` / `with check (true)`, lo que permite a CUALQUIER usuario
-- autenticado leer, modificar y borrar los pagos de TODOS los entrenadores.
-- schema.sql tiene la versión correcta, pero la base se construyó de forma
-- incremental (ver migrate_rhythm_notes.sql), así que probablemente la
-- permisiva sea la que está viva.
--
-- Este script es idempotente: se puede correr sin importar cuál esté activa.
-- ============================================================

-- 1. Antes de tocar nada: ver qué hay hoy.
--    Si la columna `qual` dice `true`, la tabla está abierta.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'payments';

-- 2. Reemplazar las políticas por las correctas, scoped por dueño del alumno.
alter table public.payments enable row level security;

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

-- 3. Verificar que quedaron bien: ninguna fila debe mostrar `qual = true`.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'payments';

-- ============================================================
-- AUDITORÍA DEL RESTO — correr y revisar a ojo
--
-- Las políticas de `alumnos` NO están en el repo: esa tabla nació como
-- `clients` y migrate_rhythm_notes.sql sólo la renombró, así que sus políticas
-- vienen de un script que no quedó versionado. Conviene confirmarlas, porque
-- payments, training_plans y training_plan_weeks cuelgan de ellas.
-- ============================================================

-- 4. ¿Alguna tabla del esquema quedó sin RLS activo?
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('alumnos', 'training_plans', 'training_plan_weeks', 'payments');

-- 5. Todas las políticas de las cuatro tablas. Buscar cualquier `qual = true`.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('alumnos', 'training_plans', 'training_plan_weeks', 'payments')
order by tablename, cmd;

-- 6. ¿Quedaron datos cruzados de la época en que payments estaba abierta?
--    Debe devolver 0 filas.
select p.id, p.alumno_id, a.created_by
from public.payments p
join public.alumnos a on a.id = p.alumno_id
where a.created_by is null;
