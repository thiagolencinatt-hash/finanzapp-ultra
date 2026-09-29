"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  PlusCircle, 
  MinusCircle, 
  FileSpreadsheet, 
  UploadCloud, 
  Eye, 
  EyeOff, 
  Bot, 
  LayoutDashboard, 
  CreditCard, 
  Target, 
  BarChart3, 
  Wallet, 
  Settings,
  ArrowRight,
  Sparkles,
  Command
} from "lucide-react";
import { usePrivacy } from "@/components/providers/PrivacyProvider";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewTransaction?: (type: "income" | "expense") => void;
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  category: "Acciones" | "Navegación";
  action: () => void;
  shortcut?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenNewTransaction,
  onOpenImportModal,
  onOpenExportModal,
}: CommandPaletteProps) {
  const router = useRouter();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: "new-expense",
      title: "Registrar Nuevo Gasto",
      subtitle: "Cargar una compra o egreso de dinero",
      icon: <MinusCircle className="w-4 h-4 text-rose-400" />,
      category: "Acciones",
      action: () => {
        onClose();
        onOpenNewTransaction?.("expense");
      },
    },
    {
      id: "new-income",
      title: "Registrar Nuevo Ingreso",
      subtitle: "Cargar sueldo, cobro o ingreso extra",
      icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
      category: "Acciones",
      action: () => {
        onClose();
        onOpenNewTransaction?.("income");
      },
    },
    {
      id: "import-statement",
      title: "Importar Extracto Bancario",
      subtitle: "Cargar archivo CSV o Excel de Mercado Pago, Santander, Galicia, etc.",
      icon: <UploadCloud className="w-4 h-4 text-blue-400" />,
      category: "Acciones",
      action: () => {
        onClose();
        onOpenImportModal?.();
      },
    },
    {
      id: "export-excel",
      title: "Exportar Finanzas a Excel",
      subtitle: "Descargar libro contable multisolapa en .xlsx",
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
      category: "Acciones",
      action: () => {
        onClose();
        onOpenExportModal?.();
      },
    },
    {
      id: "toggle-privacy",
      title: isPrivate ? "Desactivar Modo Privacidad" : "Activar Modo Privacidad (Ocultar Saldos)",
      subtitle: "Oculta o desenfoca los números confidenciales de la pantalla",
      icon: isPrivate ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-zinc-400" />,
      category: "Acciones",
      shortcut: "P",
      action: () => {
        togglePrivacy();
        onClose();
      },
    },
    {
      id: "nav-dashboard",
      title: "Ir al Panel Principal (Dashboard)",
      subtitle: "Vista general de balance, gastos y cuotas",
      icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
      category: "Navegación",
      action: () => {
        router.push("/");
        onClose();
      },
    },
    {
      id: "nav-transactions",
      title: "Ir al Historial de Transacciones",
      subtitle: "Buscar, filtrar y editar todos los movimientos",
      icon: <CreditCard className="w-4 h-4 text-zinc-300" />,
      category: "Navegación",
      action: () => {
        router.push("/transactions");
        onClose();
      },
    },
    {
      id: "nav-analytics",
      title: "Ir a Reportes y Analíticas",
      subtitle: "Gráficos de evolución mensual y distribución",
      icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
      category: "Navegación",
      action: () => {
        router.push("/analytics");
        onClose();
      },
    },
    {
      id: "nav-goals",
      title: "Ir a Metas de Ahorro",
      subtitle: "Ver progreso de tus objetivos y wishlist",
      icon: <Target className="w-4 h-4 text-emerald-400" />,
      category: "Navegación",
      action: () => {
        router.push("/goals");
        onClose();
      },
    },
    {
      id: "nav-accounts",
      title: "Ir a Cuentas y Billeteras",
      subtitle: "Gestionar bancos, efectivo y cuentas virtuales",
      icon: <Wallet className="w-4 h-4 text-amber-400" />,
      category: "Navegación",
      action: () => {
        router.push("/accounts");
        onClose();
      },
    },
    {
      id: "nav-settings",
      title: "Ir a Configuración",
      subtitle: "Preferencias, sueldo y respaldos",
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      category: "Navegación",
      action: () => {
        router.push("/settings");
        onClose();
      },
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-zinc-950 border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-zinc-900/60">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar acción, pantalla o atajo (ej: gasto, banco, metas)..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No se encontraron comandos para &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/[0.08] border border-white/[0.1] text-zinc-100"
                      : "hover:bg-white/[0.03] text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/[0.06]">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate text-zinc-100">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with shortcuts info */}
        <div className="px-4 py-2.5 bg-zinc-900/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ para seleccionar</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Command className="w-3 h-3" />
            <span>+ K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
