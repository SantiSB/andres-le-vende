"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Brand } from "../../../components/ui";
import { createClient } from "../../../lib/supabase/browser";
import { isSupabaseConfigured } from "../../../lib/supabase/config";

export default function CompleteInvitationPage() {
  const [error, setError] = useState("");
  const activation =
    useRef<Promise<{ session: boolean; error: boolean }> | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    let active = true;
    // Las invitaciones y recuperaciones predeterminadas llegan con tokens en
    // el fragmento. El servidor nunca los recibe, así que hay que convertirlos
    // en una sesión con cookies antes de navegar a la página protegida.
    if (!activation.current) {
      activation.current = (async () => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const callbackError = params.get("error_code");
        if (window.location.hash) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
        if (callbackError) return { session: false, error: true };

        const supabase = createClient();
        const { data, error } =
          accessToken && refreshToken
            ? await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
            : await supabase.auth.getSession();
        return { session: Boolean(data.session), error: Boolean(error) };
      })();
    }

    void activation.current
      .then(({ session, error: sessionError }) => {
        if (!active) return;
        if (session) {
          window.location.replace("/establecer-clave");
        } else {
          setError(
            sessionError
              ? "No pudimos validar el enlace. Solicita uno nuevo."
              : "El enlace no es válido o ya venció.",
          );
        }
      })
      .catch(() => {
        if (active) setError("No pudimos validar el enlace. Solicita uno nuevo.");
      });
    return () => {
      active = false;
    };
  }, [configured]);

  const displayError = configured
    ? error
    : "La aplicación todavía no tiene configurado el acceso.";

  return (
    <main className="login-page">
      <div className="login-card">
        <Brand />
        <span className="eyebrow">ACCESO PRIVADO</span>
        <h1>Activando tu cuenta</h1>
        {displayError ? (
          <>
            <p role="alert" className="login-error">
              {displayError}
            </p>
            <Link href="/ingresar" className="login-back">
              Ir al inicio de sesión
            </Link>
          </>
        ) : (
          <p role="status">Estamos validando tu invitación…</p>
        )}
      </div>
    </main>
  );
}
