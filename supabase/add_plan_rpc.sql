-- ============================================================
-- Escritura atómica de planes + semanas
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema que resuelve:
-- updatePlanAction hacía `delete` y luego `insert` en dos viajes separados,
-- sin transacción. Si el insert fallaba (corte de red, payload inválido), el
-- delete ya había commiteado y el plan perdía TODAS sus semanas de forma
-- irrecuperable. createPlanAction tenía la variante suave: un plan huérfano
-- sin semanas si el segundo insert fallaba.
--
-- Estas funciones hacen todo en una sola transacción: o queda todo, o no
-- queda nada. Son `security invoker`, así que las políticas RLS del usuario
-- que llama siguen aplicando exactamente igual que antes.
-- ============================================================

-- Inserta las semanas de un plan a partir de un array JSON.
-- `week_number` se deriva del orden del array — nunca se confía en el valor
-- que mandó el cliente.
create or replace function public.insert_plan_weeks(p_plan_id uuid, p_weeks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
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

-- Crea un plan y sus semanas en una sola transacción.
-- Verifica que el alumno pertenezca a quien llama: la RLS de training_plans
-- sólo mira created_by, así que sin este check se podría colgar un plan del
-- alumno de otro entrenador pasando su id.
create or replace function public.create_plan_with_weeks(
  p_alumno_id  uuid,
  p_title      text,
  p_start_date date,
  p_end_date   date,
  p_notes      text,
  p_weeks      jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  if not exists (
    select 1 from public.alumnos
    where id = p_alumno_id and created_by = (select auth.uid())
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.training_plans
    (alumno_id, created_by, title, start_date, end_date, notes, active)
  values
    (p_alumno_id, (select auth.uid()), p_title, p_start_date, p_end_date, p_notes, true)
  returning id into v_plan_id;

  perform public.insert_plan_weeks(v_plan_id, p_weeks);

  return v_plan_id;
end;
$$;

-- Actualiza un plan y reemplaza por completo su set de semanas, atómicamente.
-- Verifica pertenencia antes de tocar nada, lo que además ahorra el round trip
-- que la Server Action hacía para lo mismo.
create or replace function public.update_plan_with_weeks(
  p_plan_id    uuid,
  p_title      text,
  p_start_date date,
  p_end_date   date,
  p_notes      text,
  p_weeks      jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.training_plans
    where id = p_plan_id and created_by = (select auth.uid())
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.training_plans
     set title = p_title,
         start_date = p_start_date,
         end_date = p_end_date,
         notes = p_notes
   where id = p_plan_id;

  -- Dentro de la transacción: si el insert de abajo falla, este delete
  -- se revierte y el plan conserva sus semanas.
  delete from public.training_plan_weeks where plan_id = p_plan_id;
  perform public.insert_plan_weeks(p_plan_id, p_weeks);
end;
$$;

revoke all on function public.insert_plan_weeks(uuid, jsonb) from public, anon;
revoke all on function public.create_plan_with_weeks(uuid, text, date, date, text, jsonb) from public, anon;
revoke all on function public.update_plan_with_weeks(uuid, text, date, date, text, jsonb) from public, anon;

grant execute on function public.create_plan_with_weeks(uuid, text, date, date, text, jsonb) to authenticated;
grant execute on function public.update_plan_with_weeks(uuid, text, date, date, text, jsonb) to authenticated;

-- Evita semanas duplicadas dentro de un mismo plan (rompía las keys de React
-- en PlanCard y dejaba el grid renderizando filas repetidas).
create unique index if not exists training_plan_weeks_plan_week_uniq
  on public.training_plan_weeks (plan_id, week_number);
