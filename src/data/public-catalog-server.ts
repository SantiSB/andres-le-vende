import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../lib/supabase/config";
import { mapPublicCatalog, type PublicCatalog } from "./public-catalog";

export async function loadPublicCatalog(): Promise<PublicCatalog> {
  const { url, key } = supabaseConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from("public_catalog").select("*");
  if (error)
    throw new Error(`No se pudo leer el catálogo público: ${error.message}`);
  return mapPublicCatalog(data);
}
