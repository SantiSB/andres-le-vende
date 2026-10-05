import type { Metadata } from "next";
import { Providers } from "../components/ui";
import "./globals.css";
import "./brand-theme.css";
export const metadata: Metadata = {
  title: "Andrés Le Vende | Tu próximo gran plan",
  description:
    "Consulta eventos, localidades y boletas disponibles. Habla directamente con Andrés por WhatsApp.",
  icons: {
    icon: { url: "/andres-logo.jpg", type: "image/jpeg" },
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
