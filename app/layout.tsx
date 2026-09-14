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
  applicationName: "Finanzas",
  title: {
    default: "Finanzas — Control de Gastos Pro",
    template: "%s | Finanzas",
  },
  description:
    "Controlá tus gastos, cuotas y metas de ahorro con la ayuda de un asistente de IA personal. Gestión financiera inteligente.",
  keywords: ["finanzas", "finanzas personales", "control de gastos", "ahorro", "IA"],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finanzas",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

import { Toaster } from "@/components/ui/Toaster";
import { ViewModeProvider } from "@/components/providers/ViewModeProvider";
import { PWARegister } from "@/components/providers/PWARegister";

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
          enableSystem
          disableTransitionOnChange
        >
          <ViewModeProvider>
            <PWARegister />
            {children}
            <Toaster position="top-center" />
          </ViewModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
