-- Migración: agregar tabla de pagos mensuales
-- Ejecutar en el SQL editor de Supabase

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
