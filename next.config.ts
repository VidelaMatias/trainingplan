import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Por defecto una página dinámica no se reutiliza nunca en el cliente: ir de
    // la lista a un alumno y volver con la flecha de la app (un <Link>; el botón
    // atrás del navegador ya reusaba su cache) re-renderizaba la lista en el
    // servidor (auth + alumnos + pagos) aunque hubieran pasado dos segundos.
    // Treinta segundos alcanzan para ese ir y venir. No deja ver datos viejos
    // después de editar: toda Server Action que escribe llama a
    // revalidateAppData() (src/lib/revalidate.ts), que vacía este cache entero.
    // Lo único que puede tardar hasta 30 s en verse es un cambio hecho desde
    // otra pestaña o dispositivo; y si una página quedó en cache con un error,
    // «Reintentar» (dashboard/error.tsx) la vuelve a pedir.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
