import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <h1>No encontramos esta página</h1>
      <p>
        El enlace puede haber cambiado. Tu próximo plan sigue en la cartelera.
      </p>
      <Link className="btn" href="/">
        Volver al catálogo
      </Link>
    </main>
  );
}
