import { z } from "zod";
import { validEventImage } from "./event-image";

z.config(z.locales.es());

const name = z.string().trim().min(1, "Este campo es obligatorio").max(120);
const money = z.number().int().min(0).max(100_000_000);
const count = z.number().int().min(1).max(10_000);
const date = z.iso.date();
export const phoneSchema = z
  .string()
  .refine(
    (v) => v === "" || /^\+?[1-9]\d{7,14}$/.test(v),
    "Usa código de país y número, sin espacios. Ej.: 573001234567",
  );
export const eventSchema = z
  .object({
    name,
    startDate: date,
    endDate: z.union([date, z.literal("")]),
    city: name,
    venue: name,
    image: z.string().refine(validEventImage, "Selecciona un flyer válido."),
    active: z.boolean(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "La fecha final debe ser posterior a la inicial",
    path: ["endDate"],
  });
export const localitySchema = z.object({
  eventId: name,
  name,
  order: z.number().int().min(0).max(100),
});
export const lotSchema = z.object({
  eventId: name,
  localityId: name,
  owner: name,
  phone: phoneSchema,
  quantity: count,
  cost: money,
  markup: z.number().min(0).max(1000),
  price: money,
  notes: z.string().max(2000),
  active: z.boolean(),
});
export const reservationInputSchema = z.object({
  lotId: name,
  quantity: count,
  note: z.string().max(2000),
});
export const settingsSchema = z.object({
  brand: name,
  phone: phoneSchema,
  markup: z.number().min(0).max(1000),
  buyerTemplate: z.string().trim().min(1).max(1500),
  sellerTemplate: z.string().trim().min(1).max(1500),
});
const timestamps = {
  id: name,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};
export const storedEventSchema = eventSchema.extend(timestamps);
export const storedLocalitySchema = localitySchema.extend({ id: name });
export const storedLotSchema = lotSchema.extend(timestamps);
export const storedReservationSchema = reservationInputSchema.extend({
  ...timestamps,
  status: z.enum(["reserved", "completed", "cancelled"]),
  unitPrice: money,
  listedUnitPrice: money.optional(),
  unitCost: money,
});
export const databaseSchema = z.object({
  events: z.array(storedEventSchema),
  localities: z.array(storedLocalitySchema),
  lots: z.array(storedLotSchema),
  reservations: z.array(storedReservationSchema),
  settings: settingsSchema,
});
export type EventInput = z.infer<typeof eventSchema>;
export type TicketEvent = z.infer<typeof storedEventSchema>;
export type LocalityInput = z.infer<typeof localitySchema>;
export type Locality = z.infer<typeof storedLocalitySchema>;
export type LotInput = z.infer<typeof lotSchema>;
export type Lot = z.infer<typeof storedLotSchema>;
export type ReservationInput = z.infer<typeof reservationInputSchema>;
export type Reservation = z.infer<typeof storedReservationSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Database = z.infer<typeof databaseSchema>;
export type Command =
  | { type: "event.save"; input: EventInput; id?: string }
  | { type: "locality.save"; input: LocalityInput; id?: string }
  | { type: "lot.save"; input: LotInput; id?: string }
  | { type: "reservation.create"; input: ReservationInput }
  | {
      type: "reservation.finish";
      id: string;
      status: "completed" | "cancelled";
      finalUnitPrice?: number;
    }
  | { type: "delete"; entity: "event" | "locality" | "lot"; id: string }
  | { type: "settings.save"; input: Settings };
