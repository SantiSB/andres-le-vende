import { redirect } from "next/navigation";
import { Brand } from "../../components/ui";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";
import { PasswordForm } from "./password-form";

export default async function SetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/ingresar");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/ingresar");
  const { data: settings } = await supabase
    .from("settings")
    .select("slot")
    .eq("slot", true)
    .maybeSingle();
  if (!settings) redirect("/sin-acceso");

  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <span className="eyebrow">CUENTA DE ADMINISTRACIÓN</span>
        <h1>Crea tu contraseña</h1>
        <p>Usa una contraseña única de al menos 12 caracteres.</p>
        <PasswordForm />
      </div>
    </main>
  );
}
