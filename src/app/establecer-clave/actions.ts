"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "../../lib/supabase/server";

export type PasswordState = { error: string };

export async function setPassword(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = z
    .string()
    .min(12)
    .max(128)
    .safeParse(formData.get("password"));
  const confirmation = formData.get("confirmation");
  if (!password.success || password.data !== confirmation) {
    return {
      error: "Usa al menos 12 caracteres y confirma la misma contraseña.",
    };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/ingresar");

  const { data: settings } = await supabase
    .from("settings")
    .select("slot")
    .eq("slot", true)
    .maybeSingle();
  if (!settings) redirect("/sin-acceso");

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    return { error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };
  }

  redirect("/admin");
}
