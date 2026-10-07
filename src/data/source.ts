export type DataSource = "supabase";

export function sourceForPath(pathname: string): DataSource | null {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "supabase"
    : null;
}
