"use client";
import { useState, type ReactNode } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventSchema,
  localitySchema,
  lotSchema,
  reservationInputSchema,
  settingsSchema,
  type TicketEvent,
  type Locality,
  type Lot,
  type EventInput,
  type LocalityInput,
  type LotInput,
  type ReservationInput,
  type Settings,
} from "../domain/model";
import { suggestedPrice, quantities } from "../domain/logic";
import { cop } from "../domain/format";
import { useStore } from "../state/store";
import { useToast } from "./ui";

function Field({
  name,
  label,
  type = "text",
  children,
  hint,
  disabled = false,
}: {
  name: string;
  label: string;
  type?: string;
  children?: ReactNode;
  hint?: string;
  disabled?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = errors[name];
  const props = {
    id: name,
    ...register(name, { valueAsNumber: type === "number" }),
    "aria-invalid": !!error,
    "aria-describedby": error
      ? `${name}-error`
      : hint
        ? `${name}-hint`
        : undefined,
    disabled,
  };
  return (
    <div className={`field ${type === "textarea" ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {type === "select" ? (
        <select {...props}>{children}</select>
      ) : type === "textarea" ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          type={type}
          step={type === "number" ? "any" : undefined}
        />
      )}
      {hint && <small id={`${name}-hint`}>{hint}</small>}
      {error && (
        <small className="field-error" id={`${name}-error`}>
          {String(error.message)}
        </small>
      )}
    </div>
  );
}
function ActiveField() {
  const { register } = useFormContext();
  return (
    <label className="checkbox full">
      <input type="checkbox" {...register("active")} /> Activo · visible si
      tiene disponibilidad
    </label>
  );
}
function Actions({
  onClose,
  label = "Guardar cambios",
}: {
  onClose: () => void;
  label?: string;
}) {
  const busy = useStore((s) => s.busy);
  return (
    <div className="form-actions">
      <button type="button" className="btn secondary" onClick={onClose}>
        Cancelar
      </button>
      <button className="btn" disabled={busy}>
        {busy ? "Guardando…" : label}
      </button>
    </div>
  );
}
function useSubmit(onClose: () => void) {
  const run = useStore((s) => s.run);
  const toast = useToast();
  const [error, setError] = useState("");
  return {
    error,
    submit: async (command: Parameters<typeof run>[0]) => {
      try {
        await run(command);
        toast("Cambios guardados");
        onClose();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron guardar los cambios.",
        );
      }
    },
  };
}
function FormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="form-error">
      {message}
    </p>
  ) : null;
}

export function EventForm({
  event,
  onClose,
}: {
  event?: TicketEvent;
  onClose: () => void;
}) {
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ?? {
      name: "",
      startDate: "",
      endDate: "",
      city: "",
      venue: "",
      image: "",
      active: true,
    },
  });
  const { submit, error } = useSubmit(onClose);
  return (
    <FormProvider {...form}>
      <form
        className="form"
        onSubmit={form.handleSubmit((input) =>
          submit({ type: "event.save", input, id: event?.id }),
        )}
      >
        <div className="form-grid">
          <Field name="name" label="Nombre del evento" />
          <Field name="city" label="Ciudad" />
          <Field name="startDate" label="Fecha de inicio" type="date" />
          <Field name="endDate" label="Fecha final (opcional)" type="date" />
          <Field name="venue" label="Lugar" />
          <ActiveField />
        </div>
        <FormError message={error} />
        <Actions
          onClose={onClose}
          label={event ? "Guardar evento" : "Crear evento"}
        />
      </form>
    </FormProvider>
  );
}
export function LocalityForm({
  eventId,
  locality,
  onClose,
}: {
  eventId: string;
  locality?: Locality;
  onClose: () => void;
}) {
  const count = useStore(
    (s) => s.data!.localities.filter((l) => l.eventId === eventId).length,
  );
  const form = useForm<LocalityInput>({
    resolver: zodResolver(localitySchema),
    defaultValues: locality ?? { eventId, name: "", order: count },
  });
  const { submit, error } = useSubmit(onClose);
  return (
    <FormProvider {...form}>
      <form
        className="form"
        onSubmit={form.handleSubmit((input) =>
          submit({ type: "locality.save", input, id: locality?.id }),
        )}
      >
        <div className="form-grid">
          <Field name="name" label="Nombre de la localidad" />
          <Field
            name="order"
            label="Orden de visualización"
            type="number"
            hint="Los números menores aparecen primero."
          />
        </div>
        <FormError message={error} />
        <Actions
          onClose={onClose}
          label={locality ? "Guardar localidad" : "Crear localidad"}
        />
      </form>
    </FormProvider>
  );
}
export function LotForm({
  lot,
  eventId,
  onClose,
}: {
  lot?: Lot;
  eventId?: string;
  onClose: () => void;
}) {
  const db = useStore((s) => s.data)!;
  const selectedId = lot?.eventId ?? eventId ?? db.events[0]?.id ?? "";
  const form = useForm<LotInput>({
    resolver: zodResolver(lotSchema),
    defaultValues: lot ?? {
      eventId: selectedId,
      localityId: db.localities.find((l) => l.eventId === selectedId)?.id ?? "",
      owner: "",
      phone: "",
      quantity: 1,
      cost: 0,
      markup: db.settings.markup,
      price: 0,
      notes: "",
      active: true,
    },
  });
  const values = useWatch({ control: form.control });
  const { submit, error } = useSubmit(onClose);
  const [manual, setManual] = useState(!!lot);
  const suggested = suggestedPrice(values.cost ?? 0, values.markup ?? 0);
  const recalc = () => {
    const v = form.getValues();
    if (!manual) form.setValue("price", suggestedPrice(v.cost, v.markup));
  };
  return (
    <FormProvider {...form}>
      <form
        className="form"
        onSubmit={form.handleSubmit((input) =>
          submit({ type: "lot.save", input, id: lot?.id }),
        )}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="eventId">Evento</label>
            <select
              id="eventId"
              {...form.register("eventId", {
                onChange: (e) =>
                  form.setValue(
                    "localityId",
                    db.localities.find((l) => l.eventId === e.target.value)
                      ?.id ?? "",
                  ),
              })}
            >
              {db.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <Field name="localityId" label="Localidad" type="select">
            <option value="">Seleccionar localidad</option>
            {db.localities
              .filter((l) => l.eventId === values.eventId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Field>
          <Field name="owner" label="Propietario" />
          <Field
            name="phone"
            label="WhatsApp del propietario (opcional)"
            hint="Código de país, sin espacios: 573001234567"
          />
          <Field
            name="quantity"
            label="Cantidad total de boletas"
            type="number"
          />
          <div className="full form-grid" onChange={recalc}>
            <Field
              name="cost"
              label="Valor por unidad para el propietario"
              type="number"
            />
            <Field name="markup" label="Recargo (%)" type="number" />
          </div>
          <div className="price-helper full">
            <span>
              Precio sugerido{" "}
              <strong>{cop(Number.isFinite(suggested) ? suggested : 0)}</strong>
            </span>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                form.setValue("price", suggested);
                setManual(false);
              }}
            >
              Usar sugerido
            </button>
          </div>
          <div onChange={() => setManual(true)}>
            <Field
              name="price"
              label="Precio público por unidad"
              type="number"
            />
          </div>
          <div className="profit-preview">
            <small>Utilidad proyectada por boleta</small>
            <strong>{cop((values.price || 0) - (values.cost || 0))}</strong>
          </div>
          <Field
            name="notes"
            label="Notas internas (opcional)"
            type="textarea"
          />
          <ActiveField />
        </div>
        <FormError message={error} />
        <Actions
          onClose={onClose}
          label={lot ? "Guardar inventario" : "Agregar inventario"}
        />
      </form>
    </FormProvider>
  );
}
export function ReservationForm({
  lot,
  onClose,
}: {
  lot: Lot;
  onClose: () => void;
}) {
  const db = useStore((s) => s.data)!;
  const available = quantities(lot, db.reservations).available;
  const form = useForm<ReservationInput>({
    resolver: zodResolver(reservationInputSchema),
    defaultValues: { lotId: lot.id, quantity: 1, note: "" },
  });
  const { submit, error } = useSubmit(onClose);
  return (
    <FormProvider {...form}>
      <form
        className="form"
        onSubmit={form.handleSubmit((input) =>
          submit({ type: "reservation.create", input }),
        )}
      >
        <div className="reservation-context">
          <strong>
            {db.events.find((e) => e.id === lot.eventId)?.name} ·{" "}
            {db.localities.find((l) => l.id === lot.localityId)?.name}
          </strong>
          <p>
            {lot.owner} · {available} disponibles · {cop(lot.price)} por boleta
          </p>
        </div>
        <Field name="quantity" label="Cantidad a reservar" type="number" />
        <Field
          name="note"
          label="Referencia o nota (opcional)"
          type="textarea"
          hint="Ej.: Santiago, WhatsApp termina en 4821, ya pagó."
        />
        <p className="muted">
          Las unidades reservadas dejan de aparecer como disponibles. Puedes
          liberarlas manualmente.
        </p>
        <FormError message={error} />
        <Actions onClose={onClose} label="Confirmar reserva" />
      </form>
    </FormProvider>
  );
}
export function SettingsForm() {
  const db = useStore((s) => s.data)!;
  const busy = useStore((s) => s.busy);
  const form = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: db.settings,
  });
  const { submit, error } = useSubmit(() => {});
  return (
    <FormProvider {...form}>
      <form
        className="form settings-form"
        onSubmit={form.handleSubmit((input) =>
          submit({ type: "settings.save", input }),
        )}
      >
        <div className="form-grid">
          <Field
            name="brand"
            label="Nombre de la marca"
            hint="Si lo cambias, aparecerá junto al logo original y en el pie de página."
          />
          <Field
            name="phone"
            label="WhatsApp de Andrés"
            hint="Código de país, sin espacios: 573001234567"
          />
          <Field
            name="markup"
            label="Recargo predeterminado (%)"
            type="number"
            hint="Se aplica a nuevos lotes; no cambia precios existentes."
          />
        </div>
        <hr />
        <h3>Mensajes de WhatsApp</h3>
        <p className="muted">
          Los botones abren la conversación con el texto preparado. Andrés o el
          comprador deciden cuándo enviarlo.
        </p>
        <Field
          name="buyerTemplate"
          label="Mensaje para compradores"
          type="textarea"
          hint="Variables: {evento}, {localidad}, {precio}"
        />
        <Field
          name="sellerTemplate"
          label="Mensaje para propietarios"
          type="textarea"
          hint="Variables: {propietario}, {cantidad}, {evento}, {localidad}"
        />
        <FormError message={error} />
        <button className="btn" disabled={busy}>
          Guardar configuración
        </button>
      </form>
    </FormProvider>
  );
}
