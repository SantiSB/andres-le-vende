import { describe, expect, it } from "vitest";
import { sourceForPath } from "./source";

describe("origen de datos", () => {
  it("usa Supabase dentro del panel y no carga datos privados fuera", () => {
    expect(sourceForPath("/admin")).toBe("supabase");
    expect(sourceForPath("/admin/eventos/abc")).toBe("supabase");
    expect(sourceForPath("/")).toBeNull();
    expect(sourceForPath("/administrador")).toBeNull();
  });
});
