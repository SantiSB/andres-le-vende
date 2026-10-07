import { AdminShell } from "../../components/admin";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/ingresar");

  const { data: settings, error: accessError } = await supabase
    .from("settings")
    .select("slot")
    .eq("slot", true)
    .maybeSingle();
  if (accessError || !settings) redirect("/sin-acceso");

  return <AdminShell>{children}</AdminShell>;
}
