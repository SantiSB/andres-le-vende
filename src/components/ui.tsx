"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Ticket,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "../state/store";
import { sourceForPath } from "../data/source";

const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function WhatsAppAction({
  href,
  missingMessage,
  className,
  children,
  label,
}: {
  href: string | null;
  missingMessage: string;
  className: string;
  children: ReactNode;
  label?: string;
}) {
  const toast = useToast();
  if (!href)
    return (
      <button
        type="button"
        className={className}
        aria-label={label}
        onClick={() => toast(missingMessage, true)}
      >
        {children}
      </button>
    );
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {children}
    </a>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  const source = sourceForPath(usePathname());
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (source) void useStore.getState().load(source);
    else useStore.getState().clear();
  }, [source]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, error = false) => setToast({ message, error })}
    >
      {children}
      {toast && (
        <div
          role={toast.error ? "alert" : "status"}
          className={`toast ${toast.error ? "toast-error" : ""}`}
        >
          {toast.error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
          <button
            aria-label="Cerrar notificación"
            onClick={() => setToast(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export function DataGate({ children }: { children: ReactNode }) {
  const { data, error, source } = useStore();
  const expectedSource = sourceForPath(usePathname());
  if (source === expectedSource && error)
    return (
      <div className="empty">
        <AlertCircle />
        <h2>No pudimos cargar tus datos</h2>
        <p>{error}</p>
        <p>Revisa la conexión e inténtalo de nuevo.</p>
        <button
          className="btn"
          onClick={() => {
            if (expectedSource) void useStore.getState().load(expectedSource);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  if (source !== expectedSource || !data)
    return (
      <div className="loading" role="status" aria-label="Cargando catálogo">
        <div className="skeleton title-skeleton" />
        <div className="event-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton card-skeleton" />
          ))}
        </div>
        <span className="sr-only">Cargando datos…</span>
      </div>
    );
  return children;
}
export function Brand({ name }: { name?: string }) {
  const localBrand = useStore(
    (s) => s.data?.settings.brand ?? "Andrés Le Vende",
  );
  const brand = name ?? localBrand;
  return (
    <Link href="/" className="brand" aria-label={`${brand}, ir al catálogo`}>
      <Image
        src="/andres-logo.jpg"
        alt={brand}
        width={1047}
        height={589}
        className="brand-logo"
        priority
      />
      {brand !== "Andrés Le Vende" && (
        <span className="brand-custom">{brand}</span>
      )}
    </Link>
  );
}
export function PublicHeader({ brand }: { brand?: string }) {
  return (
    <header className="public-header wrap">
      <Brand name={brand} />
      <Link href="/admin" className="admin-link">
        Panel de Andrés <ArrowUpRight size={16} />
      </Link>
    </header>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Cerrar diálogo"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Ticket size={32} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
