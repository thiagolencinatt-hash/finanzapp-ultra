import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ["192.168.1.41", "localhost:3000", "*.loca.lt"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // exceljs tiene dependencias con módulos nativos: excluir del bundle del servidor
  serverExternalPackages: ["exceljs"],
  // PWA se configurará manualmente sin next-pwa para evitar conflictos con Turbopack
};

export default nextConfig;
