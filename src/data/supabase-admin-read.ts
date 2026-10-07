import type { Database } from "../domain/model";
import { createClient } from "../lib/supabase/browser";
import { mapAdminRows } from "./admin-mapper";

export async function loadSupabaseAdmin(): Promise<Database> {
  const supabase = createClient();
  const [events, localities, lots, reservations, settings] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,name,start_date,end_date,city,venue,image_path,active,created_at,updated_at",
        { count: "exact" },
      ),
    supabase
      .from("localities")
      .select("id,event_id,name,sort_order", { count: "exact" }),
    supabase
      .from("lots")
      .select(
        "id,event_id,locality_id,owner_name,owner_phone,quantity,unit_cost,markup_percent,unit_price,notes,active,created_at,updated_at",
        { count: "exact" },
      ),
    supabase
      .from("reservations")
      .select(
        "id,lot_id,quantity,note,status,unit_price,listed_unit_price,unit_cost,created_at,updated_at",
        { count: "exact" },
      ),
    supabase
      .from("settings")
      .select(
        "brand,whatsapp_phone,default_markup_percent,buyer_template,seller_template",
      )
      .eq("slot", true)
      .single(),
  ]);
  for (const result of [events, localities, lots, reservations, settings]) {
    if (result.error)
      throw new Error(
        `No se pudieron leer los datos privados: ${result.error.message}`,
      );
  }
  for (const result of [events, localities, lots, reservations]) {
    if (result.count !== result.data?.length) {
      throw new Error("La base de datos devolvió un inventario incompleto.");
    }
  }
  if (!settings.data)
    throw new Error("No existe la configuración del administrador.");
  return mapAdminRows({
    events: events.data,
    localities: localities.data,
    lots: lots.data,
    reservations: reservations.data,
    settings: settings.data,
  });
}
