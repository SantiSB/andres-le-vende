import { z } from "zod";
import type { Command, Database } from "../domain/model";
import {
  eventSchema,
  localitySchema,
  lotSchema,
  reservationInputSchema,
  settingsSchema,
} from "../domain/model";
import { createClient } from "../lib/supabase/browser";
import type { Repository } from "./repository";
import { loadSupabaseAdmin } from "./supabase-admin-read";

const finalPrice = z.number().int().min(0).max(100_000_000);

export class SupabaseRepository implements Repository {
  load(): Promise<Database> {
    return loadSupabaseAdmin();
  }

  async execute(command: Command): Promise<Database> {
    const supabase = createClient();
    let error: { message: string } | null = null;
    let changed = false;

    if (command.type === "event.save") {
      const input = eventSchema.parse(command.input);
      const values = {
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate || null,
        city: input.city,
        venue: input.venue,
        image_path: input.image || null,
        active: input.active,
      };
      const result = command.id
        ? await supabase
            .from("events")
            .update(values)
            .eq("id", command.id)
            .select("id")
            .single()
        : await supabase.from("events").insert(values).select("id").single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "locality.save") {
      const input = localitySchema.parse(command.input);
      const values = {
        event_id: input.eventId,
        name: input.name,
        sort_order: input.order,
      };
      const result = command.id
        ? await supabase
            .from("localities")
            .update(values)
            .eq("id", command.id)
            .select("id")
            .single()
        : await supabase
            .from("localities")
            .insert(values)
            .select("id")
            .single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "lot.save") {
      const input = lotSchema.parse(command.input);
      const values = {
        event_id: input.eventId,
        locality_id: input.localityId,
        owner_name: input.owner,
        owner_phone: input.phone,
        quantity: input.quantity,
        unit_cost: input.cost,
        markup_percent: input.markup,
        unit_price: input.price,
        notes: input.notes,
        active: input.active,
      };
      const result = command.id
        ? await supabase
            .from("lots")
            .update(values)
            .eq("id", command.id)
            .select("id")
            .single()
        : await supabase.from("lots").insert(values).select("id").single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "reservation.create") {
      const input = reservationInputSchema.parse(command.input);
      // El trigger copia costo y precio del lote bajo bloqueo.
      const result = await supabase
        .from("reservations")
        .insert({
          lot_id: input.lotId,
          quantity: input.quantity,
          note: input.note,
        })
        .select("id")
        .single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "reservation.finish") {
      const values: { status: "completed" | "cancelled"; unit_price?: number } =
        {
          status: command.status,
        };
      if (command.finalUnitPrice !== undefined) {
        if (command.status !== "completed") {
          throw new Error(
            "Solo una venta completada puede tener precio final.",
          );
        }
        values.unit_price = finalPrice.parse(command.finalUnitPrice);
      }
      const result = await supabase
        .from("reservations")
        .update(values)
        .eq("id", command.id)
        .select("id")
        .single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "settings.save") {
      const input = settingsSchema.parse(command.input);
      const result = await supabase
        .from("settings")
        .update({
          brand: input.brand,
          whatsapp_phone: input.phone,
          default_markup_percent: input.markup,
          buyer_template: input.buyerTemplate,
          seller_template: input.sellerTemplate,
        })
        .eq("slot", true)
        .select("slot")
        .single();
      error = result.error;
      changed = Boolean(result.data);
    } else if (command.type === "delete") {
      const table =
        command.entity === "event"
          ? "events"
          : command.entity === "locality"
            ? "localities"
            : "lots";
      const result = await supabase
        .from(table)
        .delete()
        .eq("id", command.id)
        .select("id")
        .single();
      error = result.error;
      changed = Boolean(result.data);
    }

    if (error) throw new Error(error.message);
    if (!changed)
      throw new Error(
        "No se encontró el registro o no tienes permiso para modificarlo.",
      );
    return this.load();
  }
}
