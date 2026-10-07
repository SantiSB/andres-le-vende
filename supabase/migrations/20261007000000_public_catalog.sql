-- Proyección pública del catálogo. La vista pertenece al rol que ejecuta la
-- migración y solo expone campos de venta; anon no recibe permisos en tablas.
-- Revisar propietario y privilegios antes de aplicar en Supabase.
create view public.public_catalog
with (security_barrier = true)
as
with committed as (
  select r.lot_id, sum(r.quantity)::integer as quantity
  from public.reservations r
  where r.status in ('reserved', 'completed')
  group by r.lot_id
), available_lots as (
  select
    t.event_id,
    t.locality_id,
    t.unit_price,
    greatest(t.quantity - coalesce(c.quantity, 0), 0) as available
  from public.lots t
  left join committed c on c.lot_id = t.id
  where t.active
)
select
  e.id as event_id,
  e.name as event_name,
  e.start_date,
  e.end_date,
  e.city,
  e.venue,
  coalesce(e.image_path, '') as image_path,
  l.id as locality_id,
  l.name as locality_name,
  l.sort_order,
  sum(a.available)::integer as quantity,
  min(a.unit_price)::integer as price,
  s.brand,
  s.whatsapp_phone,
  s.buyer_template
from available_lots a
join public.events e on e.id = a.event_id and e.active
join public.localities l on l.id = a.locality_id and l.event_id = e.id
join public.settings s on s.slot = true
where a.available > 0
group by e.id, l.id, s.slot;

revoke all on public.public_catalog from public, anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

comment on view public.public_catalog is
  'Solo datos públicos por evento/localidad. No añadir propietario, costo, margen, notas, reservas ni plantilla de vendedor.';
