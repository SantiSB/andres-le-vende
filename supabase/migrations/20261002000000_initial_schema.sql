-- Módulo 3: esquema inicial. No carga inventario real ni habilita reservas.
-- Aplicar en un proyecto Supabase nuevo; no ejecutar sobre datos existentes sin revisión.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant usage on schema app_private to service_role;

create table public.admin_users (
  slot boolean primary key default true check (slot),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- La única fila se añadirá después de crear la cuenta de Andrés (módulo 4).
create function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function app_private.is_admin() from public, anon, authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_admin() to service_role;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  venue text not null check (char_length(btrim(venue)) between 1 and 120),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  sort_order integer not null default 0 check (sort_order between 0 and 100),
  unique (event_id, id)
);
create unique index localities_event_name_unique
  on public.localities (event_id, lower(btrim(name)));
create index localities_event_order_idx
  on public.localities (event_id, sort_order, id);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  locality_id uuid not null,
  owner_name text not null check (char_length(btrim(owner_name)) between 1 and 120),
  owner_phone text not null default ''
    check (owner_phone = '' or owner_phone ~ '^\+?[1-9][0-9]{7,14}$'),
  quantity integer not null check (quantity between 1 and 10000),
  unit_cost integer not null check (unit_cost between 0 and 100000000),
  markup_percent numeric(7, 3) not null check (markup_percent between 0 and 1000),
  unit_price integer not null check (unit_price between 0 and 100000000),
  notes text not null default '' check (char_length(notes) <= 2000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, locality_id)
    references public.localities (event_id, id) on delete cascade
);
create index lots_locality_active_price_idx
  on public.lots (locality_id, active, unit_price);
create index lots_event_idx on public.lots (event_id);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 10000),
  note text not null default '' check (char_length(note) <= 2000),
  status text not null default 'reserved'
    check (status in ('reserved', 'completed', 'cancelled')),
  -- unit_price empieza como precio publicado y puede pasar a precio negociado.
  unit_price integer not null check (unit_price between 0 and 100000000),
  listed_unit_price integer not null
    check (listed_unit_price between 0 and 100000000),
  unit_cost integer not null check (unit_cost between 0 and 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservations_lot_committed_idx
  on public.reservations (lot_id, status)
  where status in ('reserved', 'completed');
create index reservations_created_idx
  on public.reservations (created_at desc, id);

create table public.settings (
  slot boolean primary key default true check (slot),
  brand text not null check (char_length(btrim(brand)) between 1 and 120),
  whatsapp_phone text not null default ''
    check (whatsapp_phone = '' or whatsapp_phone ~ '^\+?[1-9][0-9]{7,14}$'),
  default_markup_percent numeric(7, 3) not null
    check (default_markup_percent between 0 and 1000),
  buyer_template text not null
    check (char_length(btrim(buyer_template)) between 1 and 1500),
  seller_template text not null
    check (char_length(btrim(seller_template)) between 1 and 1500),
  updated_at timestamptz not null default now()
);
insert into public.settings (
  brand, whatsapp_phone, default_markup_percent, buyer_template, seller_template
) values (
  'Andrés Le Vende', '', 15,
  'Hola, Andrés. Estoy interesado en una boleta para {evento}, localidad {localidad}. Vi que hay disponibilidad desde {precio}. ¿Qué opciones tienes?',
  'Hola, {propietario}. Tengo un comprador para {cantidad} boleta(s) de {evento}, localidad {localidad}. ¿Las tienes disponibles para continuar con la transferencia?'
);

-- El valor de updated_at siempre lo pone la base de datos.
create function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function app_private.touch_updated_at() from public, anon, authenticated;
grant execute on function app_private.touch_updated_at() to authenticated;
grant execute on function app_private.touch_updated_at() to service_role;

create trigger events_touch_updated_at before update on public.events
  for each row execute function app_private.touch_updated_at();
create trigger lots_touch_updated_at before update on public.lots
  for each row execute function app_private.touch_updated_at();
create trigger reservations_touch_updated_at before update on public.reservations
  for each row execute function app_private.touch_updated_at();
create trigger settings_touch_updated_at before update on public.settings
  for each row execute function app_private.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.localities enable row level security;
alter table public.lots enable row level security;
alter table public.reservations enable row level security;
alter table public.settings enable row level security;

-- Los defaults de permisos de Supabase varían por proyecto. Se revocan
-- explícitamente para que anon jamás lea costos, teléfonos o notas.
revoke all on table public.admin_users, public.events, public.localities,
  public.lots, public.reservations, public.settings
  from public, anon, authenticated;

grant select, insert, update, delete on public.events, public.localities
  to authenticated;
grant select, insert, delete on public.lots to authenticated;
grant select on public.reservations to authenticated;
grant select, update on public.settings to authenticated;

-- El service_role solo se usa desde el servidor y para aprovisionamiento.
grant select, insert, update, delete on public.admin_users, public.events,
  public.localities, public.lots, public.reservations, public.settings
  to service_role;

create policy admin_events on public.events for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));
create policy admin_localities on public.localities for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));
create policy admin_lots on public.lots for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));
create policy admin_reservations_read on public.reservations
  for select to authenticated
  using ((select app_private.is_admin()));
create policy admin_settings on public.settings for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

-- No hay privilegios directos para reservar, completar, cancelar ni editar
-- lotes existentes. El módulo 5 añadirá funciones transaccionales para ello.
-- No hay vistas públicas ni funciones SECURITY DEFINER en el esquema expuesto.
