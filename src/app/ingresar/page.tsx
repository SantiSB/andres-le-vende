import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "../../components/ui";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ invitacion?: string }>;
}) {
  const { invitacion } = await searchParams;
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      const { data: settings } = await supabase
        .from("settings")
        .select("slot")
        .eq("slot", true)
        .maybeSingle();
      if (settings) redirect("/admin");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <span className="eyebrow">ACCESO PRIVADO</span>
        <h1>Panel de administración</h1>
        <p>
          Ingresa con la cuenta autorizada para gestionar eventos y boletas.
        </p>
        {invitacion === "invalida" && (
          <p role="alert" className="login-error">
            El enlace de invitación no es válido o venció. Solicita uno nuevo.
          </p>
        )}
        {configured ? (
          <LoginForm />
        ) : (
          <p role="status" className="login-error">
            El acceso está pendiente de configuración. No uses aún este panel
            para operar ventas reales.
          </p>
        )}
        <Link href="/" className="login-back">
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
