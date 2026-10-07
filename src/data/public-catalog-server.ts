import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../lib/supabase/config";
import { mapPublicCatalog, type PublicCatalog } from "./public-catalog";

export async function loadPublicCatalog(): Promise<PublicCatalog> {
  const { url, key } = supabaseConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [catalog, settings] = await Promise.all([
    supabase.from("public_catalog").select("*"),
    supabase
      .from("public_site_settings")
      .select("brand,whatsapp_phone,buyer_template")
      .single(),
  ]);
  if (catalog.error)
    throw new Error(
      `No se pudo leer el catálogo público: ${catalog.error.message}`,
    );
  if (settings.error)
    throw new Error(
      `No se pudo leer el contacto público: ${settings.error.message}`,
    );
  return mapPublicCatalog(catalog.data, settings.data);
}
