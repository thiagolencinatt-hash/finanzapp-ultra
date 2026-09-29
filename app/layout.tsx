import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "FinanzApp Ultra",
  title: {
    default: "FinanzApp Ultra — Finanzas & Horarios Pro",
    template: "%s | FinanzApp Ultra",
  },
  description:
    "Control de finanzas personales, haberes laborales, turnos semanales y auditoría inteligente con IA.",
  keywords: ["finanzas", "finanzas personales", "control de gastos", "haberes", "recibo de sueldo", "turnos laborales", "IA"],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinanzApp Ultra",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090D14" },
    { media: "(prefers-color-scheme: light)", color: "#090D14" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

import { Toaster } from "@/components/ui/Toaster";
import { ViewModeProvider } from "@/components/providers/ViewModeProvider";
import { PWARegister } from "@/components/providers/PWARegister";
import { RealtimeSync } from "@/components/providers/RealtimeSync";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ViewModeProvider>
            <PrivacyProvider>
              <PWARegister />
              <RealtimeSync />
              {children}
              <Toaster position="top-center" />
            </PrivacyProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

