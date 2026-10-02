-- ============================================================
-- Migración: alumnos "free" (liberados de pagar cuotas)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Un alumno free no adeuda cuotas: no entra en "Cuotas pendientes" ni en el
-- reporte de métodos de pago. Sus pagos ya registrados no se borran — si deja
-- de ser free, su historial vuelve tal cual estaba.
-- Re-ejecutable: la columna usa `if not exists`.
-- ============================================================

alter table public.alumnos
  add column if not exists is_free boolean not null default false;

-- ============================================================
-- Verificación
-- ============================================================
select is_free, count(*) as alumnos
from public.alumnos
group by is_free;
