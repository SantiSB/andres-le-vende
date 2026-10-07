import Link from "next/link";
import { signOut } from "../ingresar/actions";

export default function NoAccessPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <span className="eyebrow">ACCESO PRIVADO</span>
        <h1>Esta cuenta no administra el panel</h1>
        <p>Si crees que es un error, habla con quien gestiona la aplicación.</p>
        <form action={signOut}>
          <button className="btn" type="submit">
            Salir de esta cuenta
          </button>
        </form>
        <Link href="/" className="login-back">
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
