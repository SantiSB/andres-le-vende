import { describe, expect, it } from "vitest";
import { mapPublicCatalog } from "./public-catalog";

const eventId = "00000000-0000-4000-8000-000000000001";
const localityId = "00000000-0000-4000-8000-000000000002";

describe("proyección pública", () => {
  it("agrupa localidades y conserva solo campos públicos", () => {
    const row = {
      event_id: eventId,
      event_name: "Concierto",
      start_date: "2026-12-01",
      end_date: null,
      city: "Bogotá",
      venue: "Estadio",
      image_path: "/posters/concierto.jpg",
      locality_id: localityId,
      locality_name: "General",
      sort_order: 0,
      quantity: 2,
      price: 950000,
      brand: "Andrés Le Vende",
      whatsapp_phone: "573000000000",
      buyer_template: "Hola, {evento}",
      owner_name: "Dato privado inesperado",
      unit_cost: 800000,
    };
    const result = mapPublicCatalog([row]);
    expect(result.events[0]).toMatchObject({
      name: "Concierto",
      quantity: 2,
      price: 950000,
      localities: [{ name: "General", quantity: 2, price: 950000 }],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /owner_name|unit_cost|Dato privado/,
    );
  });

  it("no sustituye un catálogo vacío por el inventario demo", () => {
    expect(mapPublicCatalog([]).events).toEqual([]);
  });
});
