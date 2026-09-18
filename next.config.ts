import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ["192.168.1.41", "localhost:3000", "*.loca.lt"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // PWA se configurará manualmente sin next-pwa para evitar conflictos con Turbopack
};

export default nextConfig;
