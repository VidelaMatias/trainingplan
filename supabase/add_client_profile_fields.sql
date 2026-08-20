-- Migración: datos ampliados del alumno (perfil, marcas y objetivos)
-- Ejecutar en el SQL editor de Supabase.
--
-- Todo es opcional salvo `objectives`, que es not null con default '[]' para
-- que el código nunca tenga que distinguir entre "sin objetivos" y null.
-- Re-ejecutable: las columnas usan `if not exists` y los checks se recrean.

alter table public.alumnos
  add column if not exists age              int,
  add column if not exists weight_kg        numeric(5,2),
  add column if not exists city             text,
  add column if not exists available_medium text,
  add column if not exists available_time   text,
  add column if not exists training_days    text,
  add column if not exists pb_5k            text,
  add column if not exists pb_10k           text,
  add column if not exists pb_21k           text,
  add column if not exists pb_42k           text,
  add column if not exists objectives       jsonb not null default '[]'::jsonb;

-- Los mismos rangos que valida Zod en el servidor. La app nunca escribe fuera
-- de ellos; esto cubre cualquier otra vía de escritura.
alter table public.alumnos drop constraint if exists alumnos_age_range;
alter table public.alumnos add constraint alumnos_age_range
  check (age is null or age between 1 and 120);

alter table public.alumnos drop constraint if exists alumnos_weight_range;
alter table public.alumnos add constraint alumnos_weight_range
  check (weight_kg is null or weight_kg between 20 and 300);

-- `objectives` siempre es un array de objetos {name, target_time, achieved_time}.
-- El check sólo garantiza la forma exterior; el contenido lo valida clientSchema.
alter table public.alumnos drop constraint if exists alumnos_objectives_is_array;
alter table public.alumnos add constraint alumnos_objectives_is_array
  check (jsonb_typeof(objectives) = 'array');
