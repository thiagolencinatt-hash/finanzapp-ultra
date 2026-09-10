"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Sun, Moon, Bell, LogOut, Settings, User as UserIcon, Check, ChevronDown, RotateCcw, FileSpreadsheet, Cloud, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ExportExcelButton } from "@/components/dashboard/ExportExcelButton";
import { ResetDataModal } from "@/components/dashboard/ResetDataModal";
import { exportFinancialsToExcel } from "@/lib/export/excel-generator";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function Header({ title, subtitle, actionButton }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Usuario");
  const [userEmail, setUserEmail] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
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
      } else {
        const match = document.cookie.match(/finance_user_name=([^;]+)/);
        if (match && match[1]) {
          setUserName(decodeURIComponent(match[1]));
        }
      }
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-16"
        style={{
          background: "hsl(var(--background) / 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid hsl(var(--border) / 0.5)",
        }}
      >
        <div>
          <h1 className="text-base sm:text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {displayTitle}
          </h1>
          {subtitle && (
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actionButton}

          {/* Botón rápido para nuevo usuario / reset a cero */}
          <button
            onClick={() => setShowResetModal(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            title="Reiniciar todos los datos a $0 para empezar con tus números reales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Empezar en Limpio</span>
          </button>

          {/* Botón rápido Exportar Excel */}
          <ExportExcelButton
            variant="outline"
            label="Excel"
            className="hidden sm:inline-flex py-1.5 px-3"
          />

          {/* Notificaciones */}
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-muted cursor-pointer"
            style={{ color: "hsl(var(--muted-foreground))" }}
            title="Notificaciones y Recordatorios"
            onClick={() => alert("¡Todo al día! No tienes alertas financieras críticas en este momento.")}
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Cambiar Tema */}
          {mounted ? (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-muted cursor-pointer"
              style={{ color: "hsl(var(--muted-foreground))" }}
              title="Cambiar tema (Claro / Oscuro)"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          {/* Indicador de Nube Activa y Auto-guardado */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm" title="Todo lo que hagas se guarda automáticamente y de forma aislada en tu cuenta">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Cloud className="w-3.5 h-3.5" />
            <span>Nube Activa</span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border transition-all hover:bg-muted/70 cursor-pointer"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-black font-extrabold text-xs shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-bold max-w-[90px] truncate text-foreground">
                {userName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl p-2 shadow-2xl border backdrop-blur-2xl z-50 animate-slide-up"
                style={{
                  background: "hsl(var(--card) / 0.95)",
                  borderColor: "hsl(var(--border))",
                }}
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
                </div>

                {/* Acciones Rápidas */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Cambiar / Nuevo Usuario</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowResetModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Empezar de Cero ($0)</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    exportFinancialsToExcel();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Excel (.xlsx)</span>
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
    </>
  );
}

