"use client";
import { toast } from "sonner";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { 
  Sun, 
  Moon, 
  Bell, 
  LogOut, 
  Settings, 
  User as UserIcon, 
  Check, 
  ChevronDown, 
  RotateCcw, 
  FileSpreadsheet, 
  Cloud, 
  Users,
  Eye,
  EyeOff,
  UploadCloud,
  Command,
  Search,
  QrCode
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ResetDataModal } from "@/components/dashboard/ResetDataModal";
import { ExportModal } from "@/components/export/ExportModal";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import { QRConnectModal } from "@/components/ui/QRConnectModal";
import { BankStatementModal } from "@/components/import/BankStatementModal";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { usePrivacy } from "@/components/providers/PrivacyProvider";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Usuario");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setMounted(true);
    // Leer perfil de sesión
    try {
      const stored = localStorage.getItem("finanzapp_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.email) setUserEmail(parsed.email);
        if (parsed.id) setUserId(parsed.id);
      }
      
      const match = document.cookie.match(/finance_user_name=([^;]+)/);
      if (match && match[1]) {
        setUserName(decodeURIComponent(match[1]));
      }

      const matchId = document.cookie.match(/finance_user_id=([^;]+)/);
      if (matchId && matchId[1]) {
        setUserId(decodeURIComponent(matchId[1]));
      }

      fetch("/api/summary", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data?.user?.id) setUserId(data.user.id);
          if (data?.user?.email) setUserEmail((prev) => prev || data.user.email);
        })
        .catch(() => {});
    } catch {
      // ignore
    }

    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Global Cmd+K / Ctrl+K listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // Limpiar todas las cookies de autenticación
    document.cookie = "finance_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "finance_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "finance_user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "finance_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "finance_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("finanzapp_user_profile");

    router.push("/login");
    router.refresh();
  }

  // Personalizar título si tiene "¡Hola"
  const displayTitle = title.includes("¡Hola")
    ? title.replace("¡Hola", `¡Hola ${userName}`)
    : title;

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-5 h-14 sm:h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.08]"
      >
        <div className="min-w-0 pr-2 flex flex-col justify-center">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none text-zinc-100">
            {displayTitle}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate max-w-[160px] sm:max-w-none">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Selector de modo Móvil / Computadora */}
          <ViewModeSelector compact />

          {/* Paleta de Comandos / Búsqueda (Cmd+K) */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            title="Buscar o comandos rápidos (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden xl:inline text-zinc-400 font-normal">Buscar</span>
            <kbd className="hidden lg:inline text-[9px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]">
              ⌘K
            </kbd>
          </button>

          {/* Modo Privacidad (Eye Toggle) */}
          <button
            onClick={togglePrivacy}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
              isPrivate
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.05] text-zinc-400 hover:text-zinc-200"
            }`}
            title={isPrivate ? "Desactivar modo privacidad (P)" : "Modo Privacidad [P] (Ocultar saldos)"}
          >
            {isPrivate ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {actionButton}

          {/* Botón rápido Importar Extracto */}
          <button
            onClick={() => setShowImportModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            title="Importar extracto bancario (CSV o Excel de Mercado Pago, Santander, Galicia, etc.)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Importar</span>
          </button>

          {/* Botón Conectar Móvil (QR) */}
          <button
            onClick={() => setShowQRModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            title="Conectar celular escaneando código QR"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Conectar Móvil</span>
          </button>

          {/* Botón rápido Exportar Excel */}
          <button
            onClick={() => setShowExportModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            title="Exportar reporte financiero a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Excel</span>
          </button>


          {/* Notificaciones */}
          <button
            className="hidden xs:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-colors bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] cursor-pointer text-zinc-400 hover:text-zinc-200"
            title="Notificaciones y Recordatorios"
            onClick={() => toast.success("¡Todo al día! No tienes alertas financieras críticas en este momento.")}
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Cambiar Tema */}
          {mounted ? (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] cursor-pointer text-zinc-400 hover:text-zinc-200"
              title="Cambiar tema (Claro / Oscuro)"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9" />
          )}

          {/* User Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:pl-1.5 sm:pr-3 sm:py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-xs font-semibold max-w-[80px] truncate text-zinc-200">
                {userName}
              </span>
              {userId && (
                <span className="text-[9px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  {userId.substring(0, 8)}
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/[0.1] bg-zinc-900/90 backdrop-blur-2xl z-50 animate-slide-up"
              >
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b mb-1" style={{ borderColor: "hsl(var(--border))" }}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-foreground truncate">{userName}</div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-medium">
                      <Cloud className="w-2.5 h-2.5" /> Nube
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {userEmail || "Sesión Activa"}
                  </div>
                  {userId && (
                    <div className="text-[10px] font-mono text-emerald-400 font-semibold truncate mt-0.5">
                      ID: {userId.substring(0, 8)}...
                    </div>
                  )}
                </div>

                {/* Acciones Rápidas */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowImportModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar Extracto Bancario</span>
                </button>

                <button
                  onClick={() => {
                    togglePrivacy();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  {isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isPrivate ? "Desactivar Privacidad" : "Modo Privacidad (P)"}</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Cambiar / Nuevo Usuario</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowExportModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar a Excel / Google Sheets</span>
                </button>

                {/* Links */}
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-muted text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4 text-primary" />
                  <span>Configuración & Backup</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Nuevo Usuario / Reset de Datos */}
      <ResetDataModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => router.refresh()}
      />

      {/* Modal de Conexión Móvil QR */}
      <QRConnectModal 
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

      {/* Modal de Exportación Excel / Google Sheets */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Modal de Importación Bancaria (CSV / Excel Multibanco) */}
      <BankStatementModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => router.refresh()}
      />

      {/* Paleta de Comandos Global (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenImportModal={() => setShowImportModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
      />
    </>
  );
}


