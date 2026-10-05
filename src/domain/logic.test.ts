import { describe, it, expect } from "vitest";
import {
  catalog,
  executeCommand,
  profit,
  quantities,
  suggestedPrice,
  validateDatabase,
} from "./logic";
import { createSeed } from "./seed";
import { whatsappLink } from "./whatsapp";
const now = "2026-09-11T12:00:00.000Z";
describe("Precios y disponibilidad", () => {
  it("calcula recargo sobre costo y utilidad en pesos enteros", () => {
    expect(suggestedPrice(400000, 12.5)).toBe(450000);
    expect(suggestedPrice(101, 12.5)).toBe(114);
    expect(profit(450000, 400000)).toBe(50000);
  });
  it("separa disponibles, reservadas y vendidas", () => {
    const db = createSeed();
    expect(quantities(db.lots[0], db.reservations)).toEqual({
      available: 2,
      reserved: 1,
      sold: 0,
    });
    expect(quantities(db.lots[2], db.reservations)).toEqual({
      available: 2,
      reserved: 0,
      sold: 1,
    });
  });
  it("agrega por localidad y no expone información privada", () => {
    const event = catalog(createSeed())[0];
    expect(event.localities[0]).toEqual({
      id: "edc-general",
      name: "General · 2 días",
      quantity: 4,
      price: 450000,
    });
    expect(JSON.stringify(event)).not.toMatch(
      /owner|phone|markup|cost|María|notes/,
    );
    expect(event.quantity).toBe(6);
  });
  it("excluye lotes inactivos, eventos inactivos y localidades agotadas", () => {
    const db = createSeed();
    db.events[0].active = false;
    db.lots
      .filter((l) => l.eventId === "luna")
      .forEach((l) => (l.active = false));
    expect(catalog(db).map((e) => e.id)).toEqual(["aurora"]);
  });
  it("ordena eventos por fecha y localidades por orden", () => {
    const db = createSeed();
    db.events.reverse();
    db.localities[0].order = 20;
    expect(catalog(db)[0].id).toBe("edc");
    expect(catalog(db)[0].localities[0].id).toBe("edc-vip");
  });
});
describe("Reservas e integridad", () => {
  it("reserva el lote más barato y cambia el desde sin mutar el original", () => {
    const db = createSeed();
    const next = executeCommand(
      db,
      {
        type: "reservation.create",
        input: { lotId: "maria", quantity: 2, note: "Prueba" },
      },
      now,
      "new",
    );
    expect(catalog(next)[0].localities[0]).toMatchObject({
      quantity: 2,
      price: 480000,
    });
    expect(quantities(db.lots[0], db.reservations).available).toBe(2);
  });
  it.each([0, -1, 1.5, 3, NaN])(
    "rechaza cantidad inválida o excesiva %s",
    (quantity) => {
      expect(() =>
        executeCommand(createSeed(), {
          type: "reservation.create",
          input: { lotId: "maria", quantity, note: "" },
        }),
      ).toThrow();
    },
  );
  it("rechaza reservas en inventario inactivo", () => {
    expect(() =>
      executeCommand(createSeed(), {
        type: "reservation.create",
        input: { lotId: "inactive", quantity: 1, note: "" },
      }),
    ).toThrow(/Activa/);
  });
  it("cancelar devuelve cantidad y precio mínimo", () => {
    const db = executeCommand(
      createSeed(),
      {
        type: "reservation.create",
        input: { lotId: "maria", quantity: 2, note: "" },
      },
      now,
      "new",
    );
    const cancelled = executeCommand(db, {
      type: "reservation.finish",
      id: "new",
      status: "cancelled",
    });
    expect(catalog(cancelled)[0].localities[0]).toMatchObject({
      quantity: 4,
      price: 450000,
    });
  });
  it("completar mantiene las unidades fuera del catálogo y no permite reprocesar", () => {
    const db = executeCommand(createSeed(), {
      type: "reservation.finish",
      id: "reserved-demo",
      status: "completed",
    });
    expect(quantities(db.lots[0], db.reservations)).toEqual({
      available: 2,
      reserved: 0,
      sold: 1,
    });
    expect(() =>
      executeCommand(db, {
        type: "reservation.finish",
        id: "reserved-demo",
        status: "cancelled",
      }),
    ).toThrow(/procesada/);
  });
  it("conserva precios históricos aunque cambie el precio del lote", () => {
    const db = createSeed();
    const next = executeCommand(db, {
      type: "lot.save",
      id: "jose",
      input: { ...db.lots[2], cost: 900000, price: 1000000 },
    });
    expect(next.reservations.find((r) => r.id === "sold-demo")).toMatchObject({
      unitCost: 700000,
      unitPrice: 780000,
    });
  });
  it("no permite reducir el total por debajo de las reservas y ventas", () => {
    const db = executeCommand(createSeed(), {
      type: "reservation.create",
      input: { lotId: "maria", quantity: 2, note: "" },
    });
    expect(() =>
      executeCommand(db, {
        type: "lot.save",
        id: "maria",
        input: { ...db.lots[0], quantity: 2 },
      }),
    ).toThrow(/menor/);
  });
  it("protege eventos, localidades y lotes con historial", () => {
    for (const [entity, id] of [
      ["event", "edc"],
      ["locality", "edc-general"],
      ["lot", "maria"],
    ] as const) {
      expect(() =>
        executeCommand(createSeed(), { type: "delete", entity, id }),
      ).toThrow(/historial/);
    }
  });
  it("elimina en cascada un evento sin historial", () => {
    const db = executeCommand(createSeed(), {
      type: "delete",
      entity: "event",
      id: "luna",
    });
    expect(db.events.some((e) => e.id === "luna")).toBe(false);
    expect(db.localities.some((l) => l.eventId === "luna")).toBe(false);
    expect(db.lots.some((l) => l.eventId === "luna")).toBe(false);
  });
  it("impide reasignar propietario cuando hay historial", () => {
    const db = createSeed();
    expect(() =>
      executeCommand(db, {
        type: "lot.save",
        id: "maria",
        input: { ...db.lots[0], owner: "Otro" },
      }),
    ).toThrow(/conservar/);
  });
  it("valida relaciones, IDs duplicados y fechas", () => {
    const db = createSeed();
    db.lots[0].localityId = "missing";
    expect(() => validateDatabase(db)).toThrow();
    const duplicate = createSeed();
    duplicate.events.push(duplicate.events[0]);
    expect(() => validateDatabase(duplicate)).toThrow(/duplicados/);
    expect(() =>
      executeCommand(createSeed(), {
        type: "event.save",
        input: { ...createSeed().events[0], endDate: "2020-01-01" },
      }),
    ).toThrow();
  });
});
describe("WhatsApp", () => {
  it("codifica variables sin interpretar caracteres del mensaje", () => {
    const href = whatsappLink(
      "+573001234567",
      "Hola {propietario}: {evento} & {cantidad}",
      { propietario: "María", evento: "EDC", cantidad: 2 },
    )!;
    expect(href).toContain("https://wa.me/573001234567?text=");
    expect(new URL(href).searchParams.get("text")).toBe("Hola María: EDC & 2");
  });
  it.each(["", "300", "hola", "0000000000", "+57 3001234567"])(
    "rechaza número no configurado o inválido %s",
    (phone) => {
      expect(whatsappLink(phone, "Hola", {})).toBeNull();
    },
  );
});
