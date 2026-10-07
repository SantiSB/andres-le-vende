-- Escrituras del administrador con reglas de inventario en PostgreSQL.
-- No aplicar hasta probar RLS, reservas concurrentes y el adaptador remoto.

create function app_private.guard_lot_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  committed integer;
begin
  -- Grants + RLS son la barrera principal. Esto evita filtrar detalles del
  -- lote a un usuario autenticado no autorizado antes del WITH CHECK.
  if (select auth.role()) = 'authenticated' and not app_private.is_admin() then
    raise exception 'No autorizado';
  end if;
  if new.id <> old.id then
    raise exception 'No se puede cambiar el identificador del lote';
  end if;
  if (
    new.event_id <> old.event_id or
    new.locality_id <> old.locality_id or
    new.owner_name <> old.owner_name
  ) and exists (
    select 1 from public.reservations r where r.lot_id = old.id
  ) then
    raise exception 'Un lote con historial no puede cambiar de evento, localidad o propietario';
  end if;
  select coalesce(sum(r.quantity), 0)::integer into committed
  from public.reservations r
  where r.lot_id = old.id and r.status in ('reserved', 'completed');
  if new.quantity < committed then
    raise exception 'La cantidad no puede ser menor que las unidades comprometidas';
  end if;
  return new;
end;
$$;
revoke all on function app_private.guard_lot_update() from public, anon, authenticated;
create trigger lots_guard_update before update on public.lots
  for each row execute function app_private.guard_lot_update();

create function app_private.guard_reservation_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lot_record public.lots%rowtype;
  event_active boolean;
  committed integer;
begin
  if (select auth.role()) = 'authenticated' and not app_private.is_admin() then
    raise exception 'No autorizado';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'reserved' then
      raise exception 'Una reserva nueva debe iniciar reservada';
    end if;
    -- Todas las reservas de un lote compiten por el mismo bloqueo. El chequeo
    -- se hace después de obtenerlo, dentro de la transacción del INSERT.
    select t.* into lot_record
    from public.lots t where t.id = new.lot_id
    for update;
    if not found then
      raise exception 'Lote no encontrado';
    end if;
    select e.active into event_active
    from public.events e where e.id = lot_record.event_id
    for share;
    if not lot_record.active or not event_active then
      raise exception 'El evento y el lote deben estar activos';
    end if;
    select coalesce(sum(r.quantity), 0)::integer into committed
    from public.reservations r
    where r.lot_id = new.lot_id and r.status in ('reserved', 'completed');
    if new.quantity < 1 or new.quantity > lot_record.quantity - committed then
      raise exception 'No hay suficientes boletas disponibles';
    end if;
    new.id := gen_random_uuid();
    new.unit_cost := lot_record.unit_cost;
    new.listed_unit_price := lot_record.unit_price;
    new.unit_price := lot_record.unit_price;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.status <> 'reserved' or new.status not in ('completed', 'cancelled') then
    raise exception 'Esta reserva ya fue procesada';
  end if;
  if new.id <> old.id or new.lot_id <> old.lot_id or
    new.quantity <> old.quantity or new.note <> old.note or
    new.listed_unit_price <> old.listed_unit_price or
    new.unit_cost <> old.unit_cost or new.created_at <> old.created_at then
    raise exception 'No se pueden modificar los datos históricos de la reserva';
  end if;
  if new.status = 'cancelled' and new.unit_price <> old.unit_price then
    raise exception 'Una reserva cancelada conserva su precio';
  end if;
  return new;
end;
$$;
revoke all on function app_private.guard_reservation_write() from public, anon, authenticated;
create trigger reservations_guard_write
  before insert or update on public.reservations
  for each row execute function app_private.guard_reservation_write();

-- El cliente no puede escribir IDs, timestamps ni snapshots monetarios.
-- En reservas el trigger sustituye los defaults por los valores del lote.
alter table public.reservations
  alter column unit_price set default 0,
  alter column listed_unit_price set default 0,
  alter column unit_cost set default 0;
revoke insert, update on public.events, public.localities, public.lots,
  public.reservations, public.settings from authenticated;
grant insert (name, start_date, end_date, city, venue, image_path, active)
  on public.events to authenticated;
grant update (name, start_date, end_date, city, venue, image_path, active)
  on public.events to authenticated;
grant insert (event_id, name, sort_order) on public.localities to authenticated;
grant update (event_id, name, sort_order) on public.localities to authenticated;
grant insert (event_id, locality_id, owner_name, owner_phone, quantity,
  unit_cost, markup_percent, unit_price, notes, active)
  on public.lots to authenticated;
grant update (event_id, locality_id, owner_name, owner_phone, quantity,
  unit_cost, markup_percent, unit_price, notes, active)
  on public.lots to authenticated;
grant insert (lot_id, quantity, note) on public.reservations to authenticated;
grant update (status, unit_price) on public.reservations to authenticated;
grant update (brand, whatsapp_phone, default_markup_percent,
  buyer_template, seller_template) on public.settings to authenticated;
create policy admin_reservations_insert on public.reservations
  for insert to authenticated
  with check ((select app_private.is_admin()));
create policy admin_reservations_update on public.reservations
  for update to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));
