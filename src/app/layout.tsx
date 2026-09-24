import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Sólo la usan los ritmos dentro de los formularios de alumno y de plan. Con el
// preload por defecto, cada página —login incluido— bajaba esta fuente con
// prioridad alta para no mostrarla; así se pide recién cuando algo la usa.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Training Planner",
  description: "Gestión de planes de entrenamiento y alumnos",
};

export const viewport: Viewport = {
  // Sin viewport-fit=cover, env(safe-area-inset-*) siempre vale 0 y la barra de
  // navegación de mobile queda debajo del gesture bar del iPhone.
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
