"use client";

import { useActionState } from "react";
import { setPassword, type PasswordState } from "./actions";

const initialState: PasswordState = { error: "" };

export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, initialState);
  return (
    <form action={action} className="login-form">
      <label htmlFor="new-password">Nueva contraseña</label>
      <input
        id="new-password"
        name="password"
        type="password"
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      <label htmlFor="confirm-password">Confirmar contraseña</label>
      <input
        id="confirm-password"
        name="confirmation"
        type="password"
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      {state.error && (
        <p role="alert" className="login-error">
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
