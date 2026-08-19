-- ============================================================
-- Índices faltantes
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Postgres NO crea índices automáticamente sobre las foreign keys. El esquema
-- original no definía ninguno, así que todas las políticas RLS y todos los
-- embeds resolvían con sequential scan.
--
-- El caso que más importa es training_plan_weeks: su política RLS corre un
-- `exists (select 1 from training_plans ...)` POR FILA, y la tabla es la que
-- más crece (100 alumnos × ~20 planes/año × ~8 semanas ≈ 15k filas/año).
--
-- payments(alumno_id) ya está cubierto por el prefijo del índice único
-- unique(alumno_id, year, month), así que no hace falta agregarlo.
-- ============================================================

-- RLS de alumnos + listado principal.
create index if not exists alumnos_created_by_idx
  on public.alumnos (created_by);

-- Embed de planes por alumno (ficha del alumno, listado con planes).
create index if not exists training_plans_alumno_id_idx
  on public.training_plans (alumno_id);

-- RLS de training_plans y de las tablas que cuelgan de ella.
create index if not exists training_plans_created_by_idx
  on public.training_plans (created_by);

-- El más importante: RLS por fila + todos los `select('*, training_plan_weeks(*)')`.
create index if not exists training_plan_weeks_plan_id_idx
  on public.training_plan_weeks (plan_id);

-- Verificación: ninguna de estas consultas debería mostrar Seq Scan.
-- explain analyze select * from public.training_plan_weeks where plan_id = '<uuid>';
-- explain analyze select * from public.training_plans where alumno_id = '<uuid>';
