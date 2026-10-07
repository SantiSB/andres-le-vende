"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1000),
});

export type SignInState = { error: string };

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isSupabaseConfigured()) {
    return { error: "El acceso aún no está configurado." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Revisa el correo y la contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "No pudimos iniciar sesión. Revisa tus datos." };
  }

  // Estar autenticado no concede acceso al inventario: RLS solo deja leer
  // esta fila al usuario que ocupa el único slot de admin_users.
  const { data: settings, error: accessError } = await supabase
    .from("settings")
    .select("slot")
    .eq("slot", true)
    .maybeSingle();
  if (accessError || !settings) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel." };
  }

  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/ingresar");
}
