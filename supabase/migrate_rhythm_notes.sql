-- Migración: renombrar tabla clients → alumnos y ajustar columnas
-- Correr en el SQL editor de Supabase si las tablas ya existen

alter table public.clients rename to alumnos;
alter table public.training_plans rename column client_id to alumno_id;
alter table public.alumnos add column if not exists rhythm_notes text;
alter table public.training_plans drop column if exists rhythm_notes;
