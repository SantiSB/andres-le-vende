import {
  databaseSchema,
  eventSchema,
  localitySchema,
  lotSchema,
  reservationInputSchema,
  settingsSchema,
  type Command,
  type Database,
  type Lot,
  type Reservation,
} from "./model";

export const suggestedPrice = (cost: number, markup: number) =>
  Math.round(cost * (1 + markup / 100));
export const profit = (price: number, cost: number) => price - cost;
export function quantities(lot: Lot, reservations: Reservation[]) {
  const related = reservations.filter((r) => r.lotId === lot.id);
  const reserved = related
    .filter((r) => r.status === "reserved")
    .reduce((s, r) => s + r.quantity, 0);
  const sold = related
    .filter((r) => r.status === "completed")
    .reduce((s, r) => s + r.quantity, 0);
  return { reserved, sold, available: lot.quantity - reserved - sold };
}
export function catalog(db: Database) {
  return db.events
    .filter((e) => e.active)
    .map((event) => {
      const localities = db.localities
        .filter((l) => l.eventId === event.id)
        .sort((a, b) => a.order - b.order)
        .map((locality) => {
          const stock = db.lots
            .filter((l) => l.localityId === locality.id && l.active)
            .map((l) => ({
              available: quantities(l, db.reservations).available,
              price: l.price,
            }))
            .filter((l) => l.available > 0);
          return {
            id: locality.id,
            name: locality.name,
            quantity: stock.reduce((s, l) => s + l.available, 0),
            price: stock.length ? Math.min(...stock.map((l) => l.price)) : 0,
          };
        })
        .filter((l) => l.quantity > 0);
      // Only explicitly public fields leave this selector.
      return {
        id: event.id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        city: event.city,
        venue: event.venue,
        image: event.image,
        localities,
        quantity: localities.reduce((s, l) => s + l.quantity, 0),
        price: localities.length
          ? Math.min(...localities.map((l) => l.price))
          : 0,
      };
    })
    .filter((e) => e.quantity > 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
export function validateDatabase(value: unknown): Database {
  const db = databaseSchema.parse(value);
  for (const group of [db.events, db.localities, db.lots, db.reservations])
    if (new Set(group.map((v) => v.id)).size !== group.length)
      throw Error("Hay identificadores duplicados.");
  for (const l of db.localities)
    if (!db.events.some((e) => e.id === l.eventId))
      throw Error("Localidad sin evento.");
  for (const l of db.lots) {
    if (
      !db.localities.some(
        (v) => v.id === l.localityId && v.eventId === l.eventId,
      )
    )
      throw Error("El evento y la localidad no coinciden.");
    if (quantities(l, db.reservations).available < 0)
      throw Error(
        "La cantidad no puede ser menor que las unidades reservadas y vendidas.",
      );
  }
  for (const r of db.reservations)
    if (!db.lots.some((l) => l.id === r.lotId))
      throw Error("Reserva sin inventario.");
  return db;
}
export function executeCommand(
  current: Database,
  command: Command,
  now = new Date().toISOString(),
  id = crypto.randomUUID(),
): Database {
  const db = structuredClone(current);
  const stamp = { id, createdAt: now, updatedAt: now };
  if (command.type === "event.save") {
    const input = eventSchema.parse(command.input);
    const existing = db.events.find((e) => e.id === command.id);
    if (command.id && !existing) throw Error("Evento no encontrado.");
    if (existing) Object.assign(existing, input, { updatedAt: now });
    else db.events.push({ ...input, ...stamp });
  } else if (command.type === "locality.save") {
    const input = localitySchema.parse(command.input);
    const existing = db.localities.find((l) => l.id === command.id);
    if (command.id && !existing) throw Error("Localidad no encontrada.");
    if (
      db.localities.some(
        (l) =>
          l.id !== command.id &&
          l.eventId === input.eventId &&
          l.name.toLocaleLowerCase() === input.name.toLocaleLowerCase(),
      )
    )
      throw Error("Ya existe una localidad con ese nombre.");
    if (existing) Object.assign(existing, input);
    else db.localities.push({ ...input, id });
  } else if (command.type === "lot.save") {
    const input = lotSchema.parse(command.input);
    const existing = db.lots.find((l) => l.id === command.id);
    if (command.id && !existing) throw Error("Inventario no encontrado.");
    if (
      existing &&
      db.reservations.some((r) => r.lotId === existing.id) &&
      (input.eventId !== existing.eventId ||
        input.localityId !== existing.localityId ||
        input.owner !== existing.owner)
    )
      throw Error(
        "Un lote con historial debe conservar su evento, localidad y propietario.",
      );
    if (existing) Object.assign(existing, input, { updatedAt: now });
    else db.lots.push({ ...input, ...stamp });
  } else if (command.type === "reservation.create") {
    const input = reservationInputSchema.parse(command.input);
    const lot = db.lots.find((l) => l.id === input.lotId);
    if (
      !lot ||
      !lot.active ||
      !db.events.find((e) => e.id === lot.eventId)?.active
    )
      throw Error("Activa el evento y el lote antes de reservar.");
    if (input.quantity > quantities(lot, db.reservations).available)
      throw Error("No hay suficientes boletas disponibles.");
    db.reservations.push({
      ...input,
      ...stamp,
      status: "reserved",
      unitPrice: lot.price,
      listedUnitPrice: lot.price,
      unitCost: lot.cost,
    });
  } else if (command.type === "reservation.finish") {
    const reservation = db.reservations.find((r) => r.id === command.id);
    if (!reservation || reservation.status !== "reserved")
      throw Error("Esta reserva ya fue procesada.");
    if (command.status === "completed" && command.finalUnitPrice !== undefined) {
      reservation.unitPrice = command.finalUnitPrice;
    }
    reservation.status = command.status;
    reservation.updatedAt = now;
  } else if (command.type === "settings.save")
    db.settings = settingsSchema.parse(command.input);
  else if (command.type === "delete") {
    const lotIds = db.lots
      .filter((l) =>
        command.entity === "event"
          ? l.eventId === command.id
          : command.entity === "locality"
            ? l.localityId === command.id
            : l.id === command.id,
      )
      .map((l) => l.id);
    if (db.reservations.some((r) => lotIds.includes(r.lotId)))
      throw Error(
        "Este registro tiene historial. Desactívalo en lugar de eliminarlo.",
      );
    db.lots = db.lots.filter((l) => !lotIds.includes(l.id));
    if (command.entity === "event") {
      db.events = db.events.filter((e) => e.id !== command.id);
      db.localities = db.localities.filter((l) => l.eventId !== command.id);
    }
    if (command.entity === "locality")
      db.localities = db.localities.filter((l) => l.id !== command.id);
  }
  return validateDatabase(db);
}
