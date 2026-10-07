"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "../../../components/ui";
import { createClient } from "../../../lib/supabase/browser";
import { isSupabaseConfigured } from "../../../lib/supabase/config";

export default function CompleteInvitationPage() {
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (data.session) {
        window.location.replace("/establecer-clave");
      } else {
        setError(
          sessionError
            ? "No pudimos validar la invitación. Solicita un enlace nuevo."
            : "El enlace de invitación no es válido o ya venció.",
        );
      }
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
