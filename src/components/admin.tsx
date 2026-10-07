"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Settings,
  ArrowUpRight,
  Plus,
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  Pencil,
  Trash2,
  Check,
  Undo2,
  Package,
  Clock3,
  Banknote,
  LogOut,
} from "lucide-react";
import { signOut } from "../app/ingresar/actions";
import { isSupabaseConfigured } from "../lib/supabase/config";
import { useStore } from "../state/store";
import { catalog, profit, quantities } from "../domain/logic";
import { cop, day, dateRange } from "../domain/format";
import { whatsappLink } from "../domain/whatsapp";
import type {
  Command,
  Locality,
  Lot,
  Reservation,
  TicketEvent,
} from "../domain/model";
import {
  Badge,
  Brand,
  DataGate,
  Empty,
  Modal,
  useToast,
  WhatsAppAction,
} from "./ui";
import {
  EventForm,
  LocalityForm,
  LotForm,
  ReservationForm,
  SettingsForm,
} from "./forms";

type Editor =
  | { kind: "event"; event?: TicketEvent }
  | { kind: "locality"; eventId: string; locality?: Locality }
  | { kind: "lot"; eventId?: string; lot?: Lot }
  | { kind: "reservation"; lot: Lot };
function EditorModal({
  editor,
  onClose,
}: {
  editor: Editor | null;
  onClose: () => void;
}) {
  if (!editor) return null;
  const title =
    editor.kind === "event"
      ? editor.event
        ? "Editar evento"
        : "Nuevo evento"
      : editor.kind === "locality"
        ? editor.locality
          ? "Editar localidad"
          : "Nueva localidad"
        : editor.kind === "lot"
          ? editor.lot
            ? "Editar inventario"
            : "Agregar inventario"
          : "Reservar boletas";
  return (
    <Modal title={title} onClose={onClose}>
      {editor.kind === "event" ? (
        <EventForm event={editor.event} onClose={onClose} />
      ) : editor.kind === "locality" ? (
        <LocalityForm
          eventId={editor.eventId}
          locality={editor.locality}
          onClose={onClose}
        />
      ) : editor.kind === "lot" ? (
        <LotForm eventId={editor.eventId} lot={editor.lot} onClose={onClose} />
      ) : (
        <ReservationForm lot={editor.lot} onClose={onClose} />
      )}
    </Modal>
  );
}
const nav = [
  {
    href: "/admin",
    label: "Resumen",
    mobileLabel: "Inicio",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/eventos",
    label: "Eventos e inventario",
    mobileLabel: "Eventos",
    icon: CalendarDays,
  },
  {
    href: "/admin/reservas",
    label: "Reservas",
    mobileLabel: "Reservas",
    icon: Ticket,
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    mobileLabel: "Ajustes",
    icon: Settings,
  },
];
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand />
        <span className="sidebar-label">TU ESPACIO DE TRABAJO</span>
        <nav aria-label="Navegación del panel">
          {nav.map(({ href, label, mobileLabel, icon: Icon }) => {
            const selected =
              path === href ||
              (href === "/admin/eventos" && path.startsWith("/admin/eventos/"));
            return (
              <Link
                aria-current={selected ? "page" : undefined}
                className={`nav-item ${selected ? "selected" : ""}`}
                href={href}
                key={href}
              >
                <Icon size={20} />
                <span className="nav-label">{label}</span>
                <span className="nav-label-mobile">{mobileLabel}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Badge tone="neutral">Inventario en línea</Badge>
          <p>
            Tu operación, en un solo lugar.
            <br />
            Inventario compartido y protegido.
          </p>
          <Link href="/" className="nav-item">
            Ver catálogo público <ArrowUpRight size={18} />
          </Link>
          {isSupabaseConfigured() && (
            <form action={signOut}>
              <button type="submit" className="nav-item">
                Cerrar sesión <LogOut size={18} />
              </button>
            </form>
          )}
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <span>
            Administración <ChevronRight size={14} />{" "}
            {nav.find((n) => n.href === path)?.label ?? "Inventario del evento"}
          </span>
          <div className="admin-person">
            <Badge tone="neutral">Datos en línea</Badge>
            <span className="avatar">A</span>
            <strong>
              {isSupabaseConfigured() ? "Administrador" : "Andrés"}
            </strong>
          </div>
        </header>
        <main className="admin-main">
          <DataGate>{children}</DataGate>
        </main>
      </div>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function useMutation() {
  const toast = useToast();
  return async (command: Command, message = "Cambios guardados") => {
    try {
      await useStore.getState().run(command);
      toast(message);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
        true,
      );
    }
  };
}
function SellerLink({ lot, quantity = 1 }: { lot: Lot; quantity?: number }) {
  const db = useStore((s) => s.data)!;
  const href = whatsappLink(lot.phone, db.settings.sellerTemplate, {
    propietario: lot.owner,
    cantidad: quantity,
    evento: db.events.find((e) => e.id === lot.eventId)?.name ?? "",
    localidad: db.localities.find((l) => l.id === lot.localityId)?.name ?? "",
  });
  return (
    <WhatsAppAction
      className="btn secondary small"
      href={href}
      missingMessage="Agrega el WhatsApp del propietario al editar este lote."
    >
      <MessageCircle size={15} /> Contactar propietario
    </WhatsAppAction>
  );
}
export function Dashboard() {
  const db = useStore((s) => s.data)!;
  const [editor, setEditor] = useState<Editor | null>(null);
  if (!db) return null;
  const available = db.lots
    .filter(
      (l) => l.active && db.events.find((e) => e.id === l.eventId)?.active,
    )
    .reduce((s, l) => s + quantities(l, db.reservations).available, 0);
  const reserved = db.reservations
    .filter((r) => r.status === "reserved")
    .reduce((s, r) => s + r.quantity, 0);
  const sold = db.reservations.filter((r) => r.status === "completed");
  const stats = [
    { label: "Boletas disponibles", value: available, icon: Ticket },
    { label: "En reserva", value: reserved, icon: Clock3 },
    {
      label: "Boletas vendidas",
      value: sold.reduce((s, r) => s + r.quantity, 0),
      icon: Check,
    },
    {
      label: "Utilidad proyectada · ventas",
      value: cop(
        sold.reduce(
          (s, r) => s + profit(r.unitPrice, r.unitCost) * r.quantity,
          0,
        ),
      ),
      icon: Banknote,
    },
  ];
  return (
    <>
      <Heading
        eyebrow="VAMOS A HACER BUENOS PLANES"
        title="Hola, Andrés."
        description="Así va tu inventario. Lo que necesitas, a la mano."
      >
        <button
          className="btn secondary"
          onClick={() => setEditor({ kind: "event" })}
        >
          <Plus size={17} />
          Nuevo evento
        </button>
        <button
          className="btn"
          disabled={!db.localities.length}
          onClick={() => setEditor({ kind: "lot" })}
        >
          <Plus size={17} />
          Agregar inventario
        </button>
      </Heading>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div>
              <span>{s.label}</span>
              <s.icon size={19} />
            </div>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Tu cartelera</h2>
              <p>{db.events.filter((e) => e.active).length} eventos activos</p>
            </div>
            <Link href="/admin/eventos" className="text-btn">
              Ver todos <ArrowUpRight size={15} />
            </Link>
          </div>
          <EventRows onEdit={(event) => setEditor({ kind: "event", event })} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Por completar</h2>
              <p>Reservas que necesitan tu atención</p>
            </div>
            <Badge tone="amber">
              {db.reservations.filter((r) => r.status === "reserved").length}
            </Badge>
          </div>
          {db.reservations
            .filter((r) => r.status === "reserved")
            .map((r) => {
              const lot = db.lots.find((l) => l.id === r.lotId)!;
              return (
                <Link href="/admin/reservas" className="pending-row" key={r.id}>
                  <span className="pending-icon">
                    <Clock3 size={20} />
                  </span>
                  <div>
                    <strong>
                      {db.events.find((e) => e.id === lot.eventId)?.name}
                    </strong>
                    <p>
                      {r.quantity} boleta(s) · {lot.owner}
                    </p>
                    <small>{r.note || "Sin referencia"}</small>
                  </div>
                  <ChevronRight size={18} />
                </Link>
              );
            })}
          {!reserved && (
            <Empty title="Todo al día">
              <p>No tienes reservas pendientes.</p>
            </Empty>
          )}
          <div className="panel-note">
            Una reserva se libera únicamente cuando tú la cancelas.
          </div>
        </section>
      </div>
      <EditorModal editor={editor} onClose={() => setEditor(null)} />
    </>
  );
}
function EventRows({ onEdit }: { onEdit: (event: TicketEvent) => void }) {
  const db = useStore((s) => s.data)!;
  const publicEvents = catalog(db);
  return (
    <div>
      {db.events.map((event, index) => {
        const current = publicEvents.find((e) => e.id === event.id);
        return (
          <div className="event-row" key={event.id}>
            <span className={`event-thumb thumb-${index % 3}`}>
              <Ticket size={22} />
            </span>
            <Link
              href={`/admin/eventos/${event.id}`}
              className="event-row-main"
            >
              <strong>{event.name}</strong>
              <small>
                {event.city} · {day(event.startDate)}
              </small>
            </Link>
            <div className="row-stock">
              <strong>{current?.quantity ?? 0} disponibles</strong>
              <small>
                {current
                  ? `Desde ${cop(current.price)}`
                  : "Sin inventario público"}
              </small>
            </div>
            <Badge tone={event.active ? "green" : "neutral"}>
              {event.active ? "Activo" : "Inactivo"}
            </Badge>
            <button
              className="icon-btn"
              aria-label={`Editar ${event.name}`}
              onClick={() => onEdit(event)}
            >
              <Pencil size={16} />
            </button>
            <Link
              href={`/admin/eventos/${event.id}`}
              className="icon-btn"
              aria-label={`Ver inventario de ${event.name}`}
            >
              <ChevronRight size={19} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
export function Events() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const db = useStore((s) => s.data);
  if (!db) return null;
  return (
    <>
      <Heading
        eyebrow="CATÁLOGO E INVENTARIO"
        title="Tus eventos"
        description="Un evento en la vitrina. Todo su inventario detrás."
      >
        <button className="btn" onClick={() => setEditor({ kind: "event" })}>
          <Plus size={17} />
          Nuevo evento
        </button>
      </Heading>
      <section className="panel">
        <EventRows onEdit={(event) => setEditor({ kind: "event", event })} />
        {!db.events.length && (
          <Empty title="Arma tu primera cartelera">
            <p>Crea un evento, agrega localidades y registra tus boletas.</p>
          </Empty>
        )}
      </section>
      <EditorModal editor={editor} onClose={() => setEditor(null)} />
    </>
  );
}
export function EventDetail({ id }: { id: string }) {
  const db = useStore((s) => s.data)!;
  const [editor, setEditor] = useState<Editor | null>(null);
  const mutate = useMutation();
  if (!db) return null;
  const event = db.events.find((e) => e.id === id);
  if (!event)
    return (
      <Empty title="Este evento no existe">
        <Link className="btn secondary" href="/admin/eventos">
          Volver a eventos
        </Link>
      </Empty>
    );
  const localities = db.localities
    .filter((l) => l.eventId === id)
    .sort((a, b) => a.order - b.order);
  const publicEvent = catalog(db).find((e) => e.id === id);
  const hasHistory = db.reservations.some(
    (r) => db.lots.find((l) => l.id === r.lotId)?.eventId === id,
  );
  return (
    <>
      <Link href="/admin/eventos" className="back-link">
        <ArrowLeft size={16} />
        Todos los eventos
      </Link>
      <Heading
        eyebrow="CENTRO DE OPERACIÓN"
        title={event.name}
        description={`${event.city} · ${event.venue} · ${dateRange(event.startDate, event.endDate)}`}
      >
        <button
          className="btn secondary"
          onClick={() => setEditor({ kind: "event", event })}
        >
          <Pencil size={16} />
          Editar evento
        </button>
        <button
          className="btn"
          disabled={!localities.length}
          onClick={() => setEditor({ kind: "lot", eventId: id })}
        >
          <Plus size={17} />
          Agregar inventario
        </button>
      </Heading>
      <div className="event-summary">
        <Badge tone={event.active ? "green" : "neutral"}>
          {event.active ? "Evento activo" : "Evento inactivo"}
        </Badge>
        <span>
          <strong>{publicEvent?.quantity ?? 0}</strong> boletas visibles
        </span>
        <span>
          {publicEvent
            ? `Desde ${cop(publicEvent.price)}`
            : "Sin disponibilidad pública"}
        </span>
        <button
          className="text-btn"
          onClick={() =>
            void mutate({
              type: "event.save",
              id,
              input: { ...event, active: !event.active },
            })
          }
        >
          {event.active ? "Desactivar evento" : "Activar evento"}
        </button>
        {!hasHistory && (
          <button
            className="text-btn danger-text"
            onClick={() => {
              if (
                confirm(
                  "¿Eliminar este evento, sus localidades y su inventario sin historial?",
                )
              )
                void mutate({ type: "delete", entity: "event", id });
            }}
          >
            Eliminar evento
          </button>
        )}
      </div>
      <div className="section-heading">
        <h2>Inventario por localidad</h2>
        <button
          className="btn secondary small"
          onClick={() => setEditor({ kind: "locality", eventId: id })}
        >
          <Plus size={16} />
          Agregar localidad
        </button>
      </div>
      {localities.map((locality) => {
        const lots = db.lots
          .filter((l) => l.localityId === locality.id)
          .sort((a, b) => a.price - b.price);
        const count =
          publicEvent?.localities.find((l) => l.id === locality.id)?.quantity ??
          0;
        const localHistory = db.reservations.some((r) =>
          lots.some((l) => l.id === r.lotId),
        );
        return (
          <section className="panel locality-panel" key={locality.id}>
            <div className="panel-heading">
              <div>
                <h2>{locality.name}</h2>
                <p>
                  {count} disponibles · {lots.length} lotes · orden{" "}
                  {locality.order}
                </p>
              </div>
              <div className="inline-actions">
                <button
                  className="icon-btn"
                  aria-label={`Editar localidad ${locality.name}`}
                  onClick={() =>
                    setEditor({ kind: "locality", eventId: id, locality })
                  }
                >
                  <Pencil size={16} />
                </button>
                {!localHistory && (
                  <button
                    className="icon-btn danger-text"
                    aria-label={`Eliminar localidad ${locality.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Eliminar esta localidad y sus lotes sin historial?",
                        )
                      )
                        void mutate({
                          type: "delete",
                          entity: "locality",
                          id: locality.id,
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="lots-grid">
              {lots.map((lot) => {
                const q = quantities(lot, db.reservations);
                const history = db.reservations.some((r) => r.lotId === lot.id);
                return (
                  <article className="lot-card" key={lot.id}>
                    <div className="lot-head">
                      <span className="owner-avatar">{lot.owner[0]}</span>
                      <div>
                        <h3>{lot.owner}</h3>
                        <small>{lot.phone || "WhatsApp sin configurar"}</small>
                      </div>
                      <Badge tone={lot.active ? "green" : "neutral"}>
                        {lot.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="lot-counts">
                      <span>
                        <strong>{q.available}</strong>Disponibles
                      </span>
                      <span>
                        <strong>{q.reserved}</strong>Reservadas
                      </span>
                      <span>
                        <strong>{q.sold}</strong>Vendidas
                      </span>
                      <span>
                        <strong>{lot.quantity}</strong>Total
                      </span>
                    </div>
                    <dl className="lot-prices">
                      <div>
                        <dt>Para el propietario / unidad</dt>
                        <dd>{cop(lot.cost)}</dd>
                      </div>
                      <div>
                        <dt>Precio público / unidad</dt>
                        <dd>{cop(lot.price)}</dd>
                      </div>
                      <div>
                        <dt>Utilidad / unidad</dt>
                        <dd className="green-text">
                          {cop(profit(lot.price, lot.cost))}
                        </dd>
                      </div>
                    </dl>
                    {lot.notes && <p className="lot-notes">{lot.notes}</p>}
                    <div className="lot-actions">
                      <button
                        className="btn small"
                        disabled={
                          !lot.active || !event.active || q.available < 1
                        }
                        onClick={() => setEditor({ kind: "reservation", lot })}
                      >
                        <Ticket size={15} />
                        Reservar
                      </button>
                      <button
                        className="btn secondary small"
                        onClick={() => setEditor({ kind: "lot", lot })}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        className="text-btn"
                        onClick={() =>
                          void mutate({
                            type: "lot.save",
                            id: lot.id,
                            input: { ...lot, active: !lot.active },
                          })
                        }
                      >
                        {lot.active ? "Desactivar" : "Activar"}
                      </button>
                      {!history && (
                        <button
                          className="icon-btn danger-text"
                          aria-label={`Eliminar lote de ${lot.owner}`}
                          onClick={() => {
                            if (confirm("¿Eliminar este lote sin historial?"))
                              void mutate({
                                type: "delete",
                                entity: "lot",
                                id: lot.id,
                              });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <SellerLink lot={lot} />
                  </article>
                );
              })}
            </div>
            {!lots.length && (
              <Empty title="Esta localidad está lista">
                <p>Agrega inventario para que aparezca en el catálogo.</p>
                <button
                  className="btn secondary"
                  onClick={() => setEditor({ kind: "lot", eventId: id })}
                >
                  Agregar inventario
                </button>
              </Empty>
            )}
          </section>
        );
      })}
      {!localities.length && (
        <Empty title="Primero, las localidades">
          <p>Agrega General, VIP o las localidades que tenga este evento.</p>
        </Empty>
      )}
      <EditorModal editor={editor} onClose={() => setEditor(null)} />
    </>
  );
}
export function Reservations() {
  const db = useStore((s) => s.data)!;
  const [tab, setTab] = useState<"active" | "history">("active");
  const [completing, setCompleting] = useState<Reservation | null>(null);
  const mutate = useMutation();
  if (!db) return null;
  const rows = db.reservations
    .filter((r) =>
      tab === "active" ? r.status === "reserved" : r.status !== "reserved",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <Heading
        eyebrow="CADA BOLETA, EN SU LUGAR"
        title="Reservas"
        description="Confirma la transferencia y completa la venta, o libera las boletas."
      />
      <div className="tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Activas{" "}
          <span>
            {db.reservations.filter((r) => r.status === "reserved").length}
          </span>
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Historial
        </button>
      </div>
      <div className="reservations-list">
        {rows.map((r) => {
          const lot = db.lots.find((l) => l.id === r.lotId)!;
          const event = db.events.find((e) => e.id === lot.eventId)!;
          return (
            <article className="panel reservation-card" key={r.id}>
              <div className="reservation-title">
                <span className="pending-icon">
                  <Package size={23} />
                </span>
                <div>
                  <h2>{event.name}</h2>
                  <p>
                    {db.localities.find((l) => l.id === lot.localityId)?.name} ·{" "}
                    {lot.owner}
                  </p>
                </div>
                <Badge
                  tone={
                    r.status === "reserved"
                      ? "amber"
                      : r.status === "completed"
                        ? "green"
                        : "neutral"
                  }
                >
                  {r.status === "reserved"
                    ? "Reservada"
                    : r.status === "completed"
                      ? "Vendida"
                      : "Cancelada"}
                </Badge>
              </div>
              <div className="reservation-details">
                <span>
                  <small>Cantidad</small>
                  <strong>{r.quantity} boleta(s)</strong>
                </span>
                <span>
                  <small>
                    {r.status === "completed"
                      ? "Precio final por unidad"
                      : "Precio publicado por unidad"}
                  </small>
                  <strong>{cop(r.unitPrice)}</strong>
                </span>
                <span>
                  <small>Total</small>
                  <strong>{cop(r.unitPrice * r.quantity)}</strong>
                </span>
                <span>
                  <small>Creada / actualizada</small>
                  <strong>
                    {day(r.createdAt)} / {day(r.updatedAt)}
                  </strong>
                </span>
              </div>
              {r.status === "completed" &&
                r.listedUnitPrice !== undefined &&
                r.listedUnitPrice !== r.unitPrice && (
                  <p className="reservation-note">
                    Precio publicado: {cop(r.listedUnitPrice)} por boleta
                  </p>
                )}
              {r.note && <p className="reservation-note">{r.note}</p>}
              <div className="reservation-actions">
                <SellerLink lot={lot} quantity={r.quantity} />
                {r.status === "reserved" && (
                  <>
                    <button
                      className="btn secondary small"
                      onClick={() => {
                        if (
                          confirm(
                            `¿Cancelar la reserva y liberar ${r.quantity} boleta(s)?`,
                          )
                        )
                          void mutate(
                            {
                              type: "reservation.finish",
                              id: r.id,
                              status: "cancelled",
                            },
                            "Reserva cancelada. Boletas liberadas.",
                          );
                      }}
                    >
                      <Undo2 size={15} />
                      Cancelar reserva
                    </button>
                    <button
                      className="btn small"
                      onClick={() => setCompleting(r)}
                    >
                      <Check size={16} />
                      Completar venta
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title={
            tab === "active"
              ? "No hay reservas pendientes"
              : "Todavía no hay historial"
          }
        >
          <p>Las reservas se crean desde el inventario de cada evento.</p>
          <Link className="btn secondary" href="/admin/eventos">
            Ir a eventos
          </Link>
        </Empty>
      )}
      {completing && (
        <CompleteSaleModal
          reservation={completing}
          onClose={() => setCompleting(null)}
          onComplete={() => setCompleting(null)}
        />
      )}
    </>
  );
}

function CompleteSaleModal({
  reservation,
  onClose,
  onComplete,
}: {
  reservation: Reservation;
  onClose: () => void;
  onComplete: () => void;
}) {
  const db = useStore((s) => s.data)!;
  const toast = useToast();
  const lot = db.lots.find((l) => l.id === reservation.lotId);
  const event = lot && db.events.find((e) => e.id === lot.eventId);
  const locality = lot && db.localities.find((l) => l.id === lot.localityId);
  const [price, setPrice] = useState(
    String(reservation.listedUnitPrice ?? reservation.unitPrice),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const numericPrice = Number(price);
  const total =
    Number.isSafeInteger(numericPrice) && numericPrice >= 0
      ? numericPrice * reservation.quantity
      : 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !Number.isSafeInteger(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > 100_000_000
    ) {
      setError("Ingresa un precio entero entre $0 y $100.000.000.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await useStore.getState().run({
        type: "reservation.finish",
        id: reservation.id,
        status: "completed",
        finalUnitPrice: numericPrice,
      });
      toast("Venta completada con el precio final registrado.");
      onComplete();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la venta.",
      );
      setSaving(false);
    }
  }

  return (
    <Modal title="Completar venta" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="reservation-context">
          <strong>
            {event?.name} · {locality?.name}
          </strong>
          <p>
            {reservation.quantity} boleta(s) · precio publicado{" "}
            {cop(reservation.listedUnitPrice ?? reservation.unitPrice)} por
            unidad
          </p>
        </div>
        <div className="field">
          <label htmlFor="final-sale-price">
            Precio final acordado por boleta
          </label>
          <input
            id="final-sale-price"
            type="number"
            min="0"
            max="100000000"
            step="1"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            autoFocus
          />
          <small>
            Se inicia con el precio publicado. Cámbialo si negociaste otro valor
            por WhatsApp.
          </small>
        </div>
        <div className="profit-preview">
          <small>Total de la venta</small>
          <strong>{cop(total)}</strong>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            Volver
          </button>
          <button type="submit" className="btn" disabled={saving}>
            <Check size={16} />
            {saving ? "Guardando…" : "Confirmar venta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Configuration() {
  return (
    <>
      <Heading
        eyebrow="A TU MANERA"
        title="Configuración"
        description="Personaliza tu marca, precios y conversaciones."
      />
      <section className="panel settings-panel">
        <SettingsForm />
      </section>
    </>
  );
}
