-- ============================================================
-- Migración: método de pago en las cuotas
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Registra si la cuota se cobró en efectivo o por transferencia, para el
-- reporte de "Métodos de pago" del panel.
-- ============================================================

alter table public.payments
  add column if not exists method text;

-- Los valores viven también en src/types/constants.ts (PAYMENT_METHODS): el
-- check es la red de seguridad del lado de la base, no la fuente de verdad.
-- `method is null` sigue siendo válido por dos razones: las cuotas cobradas
-- antes de esta migración no tienen forma de saber cómo se pagaron (el reporte
-- las agrupa como "Sin especificar"), y desmarcar una cuota limpia la columna.
alter table public.payments
  drop constraint if exists payments_method_check;

alter table public.payments
  add constraint payments_method_check
  check (method is null or method in ('cash', 'transfer'));

-- Una cuota impaga no puede arrastrar un método: si no se cobró, no se cobró
-- de ninguna manera. Sin esto, desmarcar y volver a mirar el reporte contaba
-- un cobro que no existe.
alter table public.payments
  drop constraint if exists payments_method_requires_paid;

alter table public.payments
  add constraint payments_method_requires_paid
  check (paid or method is null);

-- El reporte agrupa por método sobre las cuotas cobradas. El índice parcial
-- cubre exactamente esa lectura y deja fuera las filas impagas, que son las
-- que más se acumulan.
create index if not exists payments_method_idx
  on public.payments (method)
  where paid;

-- ============================================================
-- Verificación
-- ============================================================
select method, count(*) as cuotas
from public.payments
where paid
group by method
order by cuotas desc;
