import { z } from "zod";
import { validateDatabase } from "../domain/logic";
import type { Database } from "../domain/model";

const eventRow = z.object({
  id: z.string().uuid(),
  name: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  city: z.string(),
  venue: z.string(),
  image_path: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
const localityRow = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number().int(),
});
const lotRow = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  locality_id: z.string().uuid(),
  owner_name: z.string(),
  owner_phone: z.string(),
  quantity: z.number().int(),
  unit_cost: z.number().int(),
  markup_percent: z.coerce.number(),
  unit_price: z.number().int(),
  notes: z.string(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
const reservationRow = z.object({
  id: z.string().uuid(),
  lot_id: z.string().uuid(),
  quantity: z.number().int(),
  note: z.string(),
  status: z.enum(["reserved", "completed", "cancelled"]),
  unit_price: z.number().int(),
  listed_unit_price: z.number().int(),
  unit_cost: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
const settingsRow = z.object({
  brand: z.string(),
  whatsapp_phone: z.string(),
  default_markup_percent: z.coerce.number(),
  buyer_template: z.string(),
  seller_template: z.string(),
});

export type AdminRows = {
  events: unknown;
  localities: unknown;
  lots: unknown;
  reservations: unknown;
  settings: unknown;
};

const timestamp = (value: string) => new Date(value).toISOString();

export function mapAdminRows(rows: AdminRows): Database {
  const events = z
    .array(eventRow)
    .parse(rows.events)
    .map((row) => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date ?? "",
      city: row.city,
      venue: row.venue,
      image: row.image_path ?? "",
      active: row.active,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    }));
  const localities = z
    .array(localityRow)
    .parse(rows.localities)
    .map((row) => ({
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      order: row.sort_order,
    }));
  const lots = z
    .array(lotRow)
    .parse(rows.lots)
    .map((row) => ({
      id: row.id,
      eventId: row.event_id,
      localityId: row.locality_id,
      owner: row.owner_name,
      phone: row.owner_phone,
      quantity: row.quantity,
      cost: row.unit_cost,
      markup: row.markup_percent,
      price: row.unit_price,
      notes: row.notes,
      active: row.active,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    }));
  const reservations = z
    .array(reservationRow)
    .parse(rows.reservations)
    .map((row) => ({
      id: row.id,
      lotId: row.lot_id,
      quantity: row.quantity,
      note: row.note,
      status: row.status,
      unitPrice: row.unit_price,
      listedUnitPrice: row.listed_unit_price,
      unitCost: row.unit_cost,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    }));
  const row = settingsRow.parse(rows.settings);
  return validateDatabase({
    events,
    localities,
    lots,
    reservations,
    settings: {
      brand: row.brand,
      phone: row.whatsapp_phone,
      markup: row.default_markup_percent,
      buyerTemplate: row.buyer_template,
      sellerTemplate: row.seller_template,
    },
  });
}
