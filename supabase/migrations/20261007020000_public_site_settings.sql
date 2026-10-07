-- Configuración comercial visible aunque el catálogo todavía no tenga eventos.
-- No incluye recargo interno ni mensaje del vendedor.
create view public.public_site_settings
with (security_barrier = true)
as
select brand, whatsapp_phone, buyer_template
from public.settings
where slot = true;

revoke all on public.public_site_settings from public, anon, authenticated;
grant select on public.public_site_settings to anon, authenticated;

comment on view public.public_site_settings is
  'Solo marca, contacto público y plantilla del comprador.';
