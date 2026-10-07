import { describe, expect, it } from "vitest";
import { mapAdminRows, type AdminRows } from "./admin-mapper";

const eventId = "00000000-0000-4000-8000-000000000001";
const localityId = "00000000-0000-4000-8000-000000000002";
const lotId = "00000000-0000-4000-8000-000000000003";
const reservationId = "00000000-0000-4000-8000-000000000004";
const date = "2026-10-07T12:00:00+00:00";

function rows(): AdminRows {
  return {
    events: [
      {
        id: eventId,
        name: "Concierto",
        start_date: "2026-12-01",
        end_date: null,
        city: "Bogotá",
        venue: "Estadio",
        image_path: null,
        active: true,
        created_at: date,
        updated_at: date,
      },
    ],
    localities: [
      {
        id: localityId,
        event_id: eventId,
        name: "General",
        sort_order: 0,
      },
    ],
    lots: [
      {
        id: lotId,
        event_id: eventId,
        locality_id: localityId,
        owner_name: "María",
        owner_phone: "573001234567",
        quantity: 2,
        unit_cost: 700000,
        markup_percent: "15.000",
        unit_price: 950000,
        notes: "Dato privado",
        active: true,
        created_at: date,
        updated_at: date,
      },
    ],
    reservations: [
      {
        id: reservationId,
        lot_id: lotId,
        quantity: 1,
        note: "Confirmar entrega",
        status: "reserved",
        unit_price: 950000,
        listed_unit_price: 950000,
        unit_cost: 700000,
        created_at: date,
        updated_at: date,
      },
    ],
    settings: {
      brand: "Andrés Le Vende",
      whatsapp_phone: "573009876543",
      default_markup_percent: "15.000",
      buyer_template: "Hola {evento}",
      seller_template: "Hola {propietario}",
    },
  };
}

describe("lectura privada de Supabase", () => {
  it("convierte los registros al dominio y preserva datos privados solo para admin", () => {
    const db = mapAdminRows(rows());
    expect(db.events[0]).toMatchObject({ id: eventId, endDate: "", image: "" });
    expect(db.lots[0]).toMatchObject({
      owner: "María",
      cost: 700000,
      markup: 15,
      notes: "Dato privado",
    });
    expect(db.reservations[0]).toMatchObject({
      lotId,
      status: "reserved",
      listedUnitPrice: 950000,
    });
    expect(db.lots[0].createdAt).toBe("2026-10-07T12:00:00.000Z");
  });

  it("rechaza referencias o inventario inconsistentes", () => {
    const input = rows();
    input.lots = [
      { ...(input.lots as Record<string, unknown>[])[0], quantity: 0 },
    ];
    expect(() => mapAdminRows(input)).toThrow();
  });

  it("no inventa configuración ni datos demo si faltan filas", () => {
    const input = rows();
    input.settings = null;
    expect(() => mapAdminRows(input)).toThrow();
  });
});
