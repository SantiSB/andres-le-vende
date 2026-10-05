"use client";
import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Search,
  MapPin,
  CalendarDays,
  MessageCircle,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { useStore } from "../state/store";
import { catalog } from "../domain/logic";
import { cop, dateRange, searchText } from "../domain/format";
import { whatsappLink } from "../domain/whatsapp";
import { Badge, DataGate, Empty, PublicHeader, WhatsAppAction } from "./ui";
export function Poster({
  name,
  index,
  image = "",
}: {
  name: string;
  index: number;
  image?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <div className={`poster poster-${index % 3}`}>
      {image && image !== failedImage ? (
        <Image
          src={image}
          alt={name}
          fill
          unoptimized
          onError={() => setFailedImage(image)}
          sizes="(max-width: 700px) 100vw, 33vw"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <>
          <div className="poster-orbit orbit-one" />
          <div className="poster-orbit orbit-two" />
          <div className="poster-grain" />
          <span className="poster-kicker">MÚSICA EN VIVO / COLOMBIA</span>
          <strong>{name}</strong>
          <span className="poster-bottom">
            EL PLAN ES ESTAR AHÍ <ArrowUpRight size={20} />
          </span>
        </>
      )}
    </div>
  );
}
function CatalogContent() {
  const db = useStore((s) => s.data)!;
  const [search, setSearch] = useState("");
  const events = catalog(db);
  const visible = events.filter((e) =>
    searchText(`${e.name} ${e.city} ${e.venue}`).includes(searchText(search)),
  );
  return (
    <>
      <section className="hero wrap">
        <div className="eyebrow">
          <span className="live-dot" /> TU PRÓXIMO GRAN RECUERDO
        </div>
        <h1>
          El plan está listo.
          <br />
          <span>Solo falta tu boleta.</span>
          <span className="hero-star" aria-hidden="true">
            ✳
          </span>
        </h1>
        <div className="hero-bottom">
          <p>
            Encuentra tu evento, elige tu localidad y habla con Andrés.
            <br className="desktop-only" /> Así de fácil empieza un buen plan.
          </p>
          <span className="hero-note">
            <MessageCircle size={19} /> Atención directa por WhatsApp
          </span>
        </div>
      </section>
      <main className="wrap catalog-main">
        <div className="catalog-toolbar">
          <div>
            <div className="eyebrow">ENCUENTRA TU PRÓXIMO PLAN</div>
            <h2>
              En cartelera <span className="count">{events.length}</span>
            </h2>
          </div>
          <label className="search">
            <Search size={19} />
            <input
              aria-label="Buscar eventos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Evento, ciudad o lugar…"
            />
            {search && (
              <button
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </label>
        </div>
        <div className="event-grid">
          {visible.map((event) => (
            <article className="event-card" key={event.id}>
              <div className="poster-wrap">
                <Poster
                  name={event.name}
                  image={event.image}
                  index={events.indexOf(event)}
                />
                <span className="poster-badge">
                  <span className="live-dot" />
                  {event.quantity} disponibles
                </span>
              </div>
              <div className="event-body">
                <div className="event-meta">
                  <CalendarDays size={14} />
                  {dateRange(event.startDate, event.endDate)}
                </div>
                <h3>{event.name}</h3>
                <p className="event-meta">
                  <MapPin size={14} />
                  {event.city} · {event.venue}
                </p>
                <div className="price-line">
                  <span>Boletas desde</span>
                  <strong>{cop(event.price)}</strong>
                </div>
                <div className="localities">
                  {event.localities.map((locality) => {
                    const href = whatsappLink(
                      db.settings.phone,
                      db.settings.buyerTemplate,
                      {
                        evento: event.name,
                        localidad: locality.name,
                        precio: cop(locality.price),
                      },
                    );
                    return (
                      <div className="public-locality" key={locality.id}>
                        <div>
                          <strong>{locality.name}</strong>
                          <small>
                            {locality.quantity} disponibles · desde{" "}
                            {cop(locality.price)}
                          </small>
                        </div>
                        <WhatsAppAction
                          className="whatsapp-btn"
                          href={href}
                          label={`Consultar ${event.name}, ${locality.name} por WhatsApp`}
                          missingMessage="Configura el WhatsApp de Andrés en el panel para probar este enlace."
                        >
                          <MessageCircle size={18} />
                          <span>Consultar</span>
                          <ArrowUpRight size={14} />
                        </WhatsAppAction>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!visible.length && (
          <Empty title="No encontramos ese plan">
            <p>Prueba con otro evento, ciudad o lugar.</p>
            <button className="btn secondary" onClick={() => setSearch("")}>
              Ver todos los eventos
            </button>
          </Empty>
        )}
        <section className="how-it-works">
          <div>
            <Ticket size={26} />
            <h3>De la pantalla al evento.</h3>
            <p>Tú eliges el plan. Andrés te ayuda con la boleta.</p>
          </div>
          <div className="how-step">
            <span>01</span>
            <p>
              Encuentra
              <br />
              <strong>tu evento</strong>
            </p>
            <ArrowRight size={18} />
          </div>
          <div className="how-step">
            <span>02</span>
            <p>
              Consulta
              <br />
              <strong>por WhatsApp</strong>
            </p>
            <ArrowRight size={18} />
          </div>
          <div className="how-step">
            <span>03</span>
            <p>
              Coordina
              <br />
              <strong>con Andrés</strong>
            </p>
          </div>
        </section>
      </main>
      <footer className="wrap public-footer">
        <span>{db.settings.brand}</span>
        <p>Eventos, fechas y precios de demostración.</p>
        <Badge tone="neutral">Demo interactivo</Badge>
      </footer>
    </>
  );
}
export function Catalog() {
  return (
    <>
      <PublicHeader />
      <DataGate>
        <CatalogContent />
      </DataGate>
    </>
  );
}
