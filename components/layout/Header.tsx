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
  QrCode,
  Sparkles,
  X,
  ChevronRight
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
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);


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
      const target = e.target as Node;
      const clickedDesktop = menuRef.current && menuRef.current.contains(target);
      const clickedMobile = mobileMenuRef.current && mobileMenuRef.current.contains(target);
      if (!clickedDesktop && !clickedMobile) {
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
        className="sticky top-0 z-30 flex items-center justify-between px-3.5 sm:px-5 h-15 sm:h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.08]"
      >
        {/* Cabecera Móvil Minimalista: Logo y Nombre "FinanzApp" */}
        <div className="flex items-center gap-2.5 sm:hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-black font-black text-sm shadow-md shadow-primary/20">
            ⚡
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            FinanzApp
          </span>
        </div>

        {/* Título en Escritorio (sm: en adelante) */}
        <div className="hidden sm:flex flex-col justify-center min-w-0 pr-2">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight truncate max-w-[200px] sm:max-w-none text-zinc-100">
            {displayTitle}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate max-w-[160px] sm:max-w-none">
              {subtitle}
            </p>
          )}
        </div>

        {/* Controles de Escritorio (sm: en adelante) */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
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

          {/* User Profile Dropdown en Desktop */}
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

        {/* Controles Móviles: DOS únicos elementos amplios (mínimo 44x44px) */}
        <div className="flex sm:hidden items-center gap-2 shrink-0 relative" ref={mobileMenuRef}>
          {/* 1. Pastilla de Usuario / ID (44x44px) */}
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95 shadow-sm"
            title={`Perfil: ${userName}`}
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              {userName.charAt(0).toUpperCase()}
            </div>
          </button>

          {/* 2. Botón de Menú de Acciones Rápidas (44x44px) */}
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(false);
              setShowMobileActionSheet(true);
            }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-amber-500/10 text-primary border border-primary/30 hover:bg-primary/25 transition-all cursor-pointer active:scale-95 shadow-[0_4px_15px_rgba(245,203,26,0.15)]"
            title="Acciones Rápidas"
          >
            <Sparkles className="w-5 h-5 text-primary stroke-[2.2]" />
          </button>

          {/* Menú de Usuario en Móviles */}
          {showUserMenu && (
            <div
              className="absolute right-0 top-13 w-64 rounded-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.7)] border border-white/[0.1] bg-zinc-900/95 backdrop-blur-2xl z-50 animate-slide-up sm:hidden"
            >
              <div className="px-3 py-2.5 border-b mb-1 border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-foreground truncate">{userName}</div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-medium">
                    <Cloud className="w-2.5 h-2.5" /> Nube
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {userEmail || "Sesión Activa"}
                </div>
                {userId && (
                  <div className="text-[10px] font-mono text-emerald-400 font-semibold truncate mt-0.5">
                    ID: {userId.substring(0, 8)}...
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push("/login");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Cambiar / Nuevo Usuario</span>
              </button>

              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors"
              >
                <Settings className="w-4 h-4 text-primary" />
                <span>Configuración & Backup</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer mt-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Bottom Sheet de Acciones Rápidas en Móviles (GEL-037) */}
      {showMobileActionSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in p-0 sm:hidden">
          {/* Overlay click to close */}
          <div
            className="fixed inset-0"
            onClick={() => setShowMobileActionSheet(false)}
          />

          <div className="relative w-full max-h-[88dvh] flex flex-col rounded-t-3xl bg-zinc-950 border-t border-white/[0.1] shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 pb-safe animate-slide-up">
            {/* Handle pill */}
            <div className="w-12 h-1.5 bg-neutral-600 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* Header del Bottom Sheet */}
            <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  Acciones Rápidas
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                    FinanzApp
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Herramientas y accesos directos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileActionSheet(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Acciones Táctiles Grandes (min-h-[52px]) */}
            <div className="p-4 space-y-2.5 overflow-y-auto max-h-[60dvh]">
              {/* 📥 1. Cargar Comprobante / PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowImportModal(true);
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-100">Cargar Comprobante / PDF</p>
                    <p className="text-[11px] text-zinc-400">Mercado Pago, fotos o extractos bancarios</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* 📊 2. Exportar a Excel / Sheets */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowExportModal(true);
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-100">Exportar a Excel / Sheets</p>
                    <p className="text-[11px] text-zinc-400">Descarga tu reporte financiero completo en .xlsx</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* 👁️ 3. Activar / Desactivar Modo Privacidad */}
              <button
                type="button"
                onClick={() => {
                  togglePrivacy();
                  setShowMobileActionSheet(false);
                  toast.success(isPrivate ? "Modo Privacidad Desactivado" : "Modo Privacidad Activado (Saldos Ocultos)");
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isPrivate
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                      : "bg-white/[0.05] border-white/[0.1] text-zinc-300"
                  }`}>
                    {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-100">
                      {isPrivate ? "Desactivar Modo Privacidad" : "Activar Modo Privacidad"}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {isPrivate ? "Mostrar números y saldos" : "Ocultar saldos de miradas indiscretas"}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isPrivate ? "bg-amber-500/20 text-amber-300" : "bg-white/[0.06] text-zinc-400"
                }`}>
                  {isPrivate ? "Oculto" : "Visible"}
                </span>
              </button>

              {/* 🔍 4. Buscar o Paleta de Comandos */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowCommandPalette(true);
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-100">Buscar o Comandos</p>
                    <p className="text-[11px] text-zinc-400">Buscar transacciones, categorías o atajos</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              {/* 📱 5. Conectar otro dispositivo (QR) */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionSheet(false);
                  setShowQRModal(true);
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-100">Conectar otro dispositivo (QR)</p>
                    <p className="text-[11px] text-zinc-400">Escaneá para sincronizar tu sesión en PC u otro móvil</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* Botón de Cerrar Sheet */}
            <div className="p-4 pt-1">
              <button
                type="button"
                onClick={() => setShowMobileActionSheet(false)}
                className="w-full min-h-[48px] h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-sm font-bold transition-all cursor-pointer border border-white/[0.08]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Importación Bancaria (CSV / Excel / PDF / Imágenes Multibanco) */}
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


