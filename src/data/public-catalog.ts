import { z } from "zod";
import type { catalog } from "../domain/logic";

const rowSchema = z.object({
  event_id: z.string().uuid(),
  event_name: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  city: z.string(),
  venue: z.string(),
  image_path: z.string(),
  locality_id: z.string().uuid(),
  locality_name: z.string(),
  sort_order: z.number().int(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  brand: z.string(),
  whatsapp_phone: z.string(),
  buyer_template: z.string(),
});
const siteSettingsSchema = z.object({
  brand: z.string(),
  whatsapp_phone: z.string(),
  buyer_template: z.string(),
});

export type PublicCatalog = {
  events: ReturnType<typeof catalog>;
  settings: { brand: string; phone: string; buyerTemplate: string };
};

export function mapPublicCatalog(
  raw: unknown,
  siteSettings?: unknown,
): PublicCatalog {
  const publicSettings =
    siteSettings === undefined ? null : siteSettingsSchema.parse(siteSettings);
  const rows = z
    .array(rowSchema)
    .parse(raw)
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        a.event_id.localeCompare(b.event_id) ||
        a.sort_order - b.sort_order ||
        a.locality_id.localeCompare(b.locality_id),
    );
  const events = new Map<string, PublicCatalog["events"][number]>();
  for (const row of rows) {
    const existing = events.get(row.event_id);
    const event = existing ?? {
      id: row.event_id,
      name: row.event_name,
      startDate: row.start_date,
      endDate: row.end_date ?? "",
      city: row.city,
      venue: row.venue,
      image:
        row.image_path.startsWith("/") && !row.image_path.startsWith("//")
          ? row.image_path
          : "",
      localities: [],
      quantity: 0,
      price: row.price,
    };
    event.localities.push({
      id: row.locality_id,
      name: row.locality_name,
      quantity: row.quantity,
      price: row.price,
    });
    event.quantity += row.quantity;
    event.price = Math.min(event.price, row.price);
    events.set(row.event_id, event);
  }
  return {
    events: [...events.values()].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    ),
    settings: {
      brand: publicSettings?.brand ?? rows[0]?.brand ?? "Andrés Le Vende",
      phone: publicSettings?.whatsapp_phone ?? rows[0]?.whatsapp_phone ?? "",
      buyerTemplate:
        publicSettings?.buyer_template ?? rows[0]?.buyer_template ?? "",
    },
  };
}
