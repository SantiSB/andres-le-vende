"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>No pudimos mostrar esta pantalla</h1>
      <p>
        Intenta cargarla de nuevo. Tus datos locales no se han restablecido.
      </p>
      <button className="btn" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
