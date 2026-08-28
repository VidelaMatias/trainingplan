-- ============================================================
-- FIX — planes que quedan sin semanas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Correr DESPUÉS de add_plan_rpc.sql (reemplaza insert_plan_weeks).
--
-- Problema:
-- insert_plan_weeks inserta con `select ... from jsonb_array_elements(p_weeks)`.
-- Si p_weeks llega como NULL o como `[]`, esa consulta no devuelve filas: no
-- falla, simplemente no inserta nada. En update_plan_with_weeks el delete de
-- las semanas viejas ya corrió dentro de la misma transacción, así que el plan
-- se queda SIN NINGUNA semana y la función devuelve éxito. La Server Action ve
-- un ok, redirige, y el entrenador se encuentra el plan vacío sin ningún aviso.
--
-- La transacción era atómica, pero atómica sobre un insert de cero filas no
-- protege de nada: hacía falta que el caso vacío fuera un error, no un no-op.
--
-- Con este guard el rollback devuelve el plan intacto y la acción muestra
-- "No se pudo actualizar el plan" en vez de romperlo en silencio.
-- ============================================================

create or replace function public.insert_plan_weeks(p_plan_id uuid, p_weeks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- jsonb_typeof(null) es NULL, así que este `is distinct from` cubre a la vez
  -- el NULL de SQL, el `null` de JSON y cualquier payload que no sea un array.
  if jsonb_typeof(p_weeks) is distinct from 'array' or jsonb_array_length(p_weeks) = 0 then
    raise exception 'plan sin semanas' using errcode = '22023';
  end if;

  insert into public.training_plan_weeks
    (plan_id, week_number, week_start,
     monday, tuesday, wednesday, thursday, friday, saturday, sunday)
  select
    p_plan_id,
    (w.ord)::int,
    (w.value->>'week_start')::date,
    w.value->>'monday',
    w.value->>'tuesday',
    w.value->>'wednesday',
    w.value->>'thursday',
    w.value->>'friday',
    w.value->>'saturday',
    w.value->>'sunday'
  from jsonb_array_elements(p_weeks) with ordinality as w(value, ord);
end;
$$;

-- create or replace no re-aplica los default privileges del esquema, pero
-- tampoco los pierde: la función ya existía. El revoke se repite por si este
-- archivo se corre sobre una base donde add_plan_rpc.sql no llegó a correr.
revoke all on function public.insert_plan_weeks(uuid, jsonb) from public, anon;

-- ============================================================
-- DIAGNÓSTICO — ¿hay planes ya rotos?
-- Devuelve los planes sin ninguna semana. Los que aparezcan acá se arreglan
-- editándolos y volviendo a cargar las semanas: el contenido viejo no se puede
-- recuperar (el delete commiteó), pero conviene saber cuáles son.
-- ============================================================
select p.id, p.title, p.start_date, p.end_date, a.first_name, a.last_name
from public.training_plans p
join public.alumnos a on a.id = p.alumno_id
where not exists (
  select 1 from public.training_plan_weeks w where w.plan_id = p.id
)
order by p.start_date desc;

-- ¿Y planes con semanas pero sin una sola sesión escrita? Son los que se ven
-- vacíos al expandirlos aunque la tarjeta diga "N semanas".
select p.id, p.title, count(w.id) as semanas
from public.training_plans p
join public.training_plan_weeks w on w.plan_id = p.id
group by p.id, p.title
having bool_and(
  w.monday is null and w.tuesday is null and w.wednesday is null and
  w.thursday is null and w.friday is null and w.saturday is null and w.sunday is null
)
order by p.start_date desc;
