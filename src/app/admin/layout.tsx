import { AdminShell } from "../../components/admin";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) redirect("/ingresar");

    const { data: settings, error: accessError } = await supabase
      .from("settings")
      .select("slot")
      .eq("slot", true)
      .maybeSingle();
    if (accessError || !settings) redirect("/sin-acceso");
  } else if (process.env.NODE_ENV !== "development") {
    // El demo local conserva su flujo; un despliegue sin Auth falla cerrado.
    redirect("/ingresar");
  }

  return <AdminShell>{children}</AdminShell>;
}
