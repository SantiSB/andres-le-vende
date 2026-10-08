import { afterEach, describe, expect, it, vi } from "vitest";
import { managedFlyerPath, validEventImage } from "./event-image";

const project = "https://example.supabase.co";
const path = "flyers/123e4567-e89b-42d3-a456-426614174000.webp";

afterEach(() => vi.unstubAllEnvs());

describe("imágenes de eventos", () => {
  it("permite flyers del bucket del proyecto y rutas locales", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", project);
    const url = `${project}/storage/v1/object/public/event-flyers/${path}`;
    expect(managedFlyerPath(url)).toBe(path);
    expect(validEventImage(url)).toBe(true);
    expect(validEventImage("/poster.svg")).toBe(true);
    expect(validEventImage("")).toBe(true);
  });

  it("rechaza otros hosts, archivos y rutas inseguras", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", project);
    expect(validEventImage(`https://other.example/${path}`)).toBe(false);
    expect(
      validEventImage(
        `${project}/storage/v1/object/public/event-flyers/${path}?x=1`,
      ),
    ).toBe(false);
    expect(validEventImage("//example.com/photo.webp")).toBe(false);
    expect(validEventImage("/../secret")).toBe(false);
  });
});
