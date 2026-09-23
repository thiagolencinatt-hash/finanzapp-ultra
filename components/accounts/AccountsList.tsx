"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Wallet, Edit2, Trash2, Building2, Smartphone, Landmark, Activity, PiggyBank, RefreshCw } from "lucide-react";
import type { Account } from "@/lib/types";
import { AccountForm } from "./AccountForm";

export function AccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // States for forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts", { cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener cuentas");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    const handleExternalRefresh = () => loadAccounts();
    window.addEventListener("finance-refresh", handleExternalRefresh);
    return () => window.removeEventListener("finance-refresh", handleExternalRefresh);
  }, [loadAccounts]);

  const handleDelete = async (accountId: string) => {
    if (!confirm("¿Estás seguro que deseas eliminar esta cuenta? Sus transacciones podrían perder consistencia.")) {
      return;
    }
    
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId }),
      });
      if (!res.ok) throw new Error("Error al eliminar cuenta");
      
      // Dispatch refresh para actualizar saldos globales
      window.dispatchEvent(new Event("finance-refresh"));
      loadAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "cash": return <Wallet className="w-5 h-5" />;
      case "bank": return <Building2 className="w-5 h-5" />;
      case "digital_wallet": return <Smartphone className="w-5 h-5" />;
      case "investment": return <Activity className="w-5 h-5" />;
      case "crypto": return <RefreshCw className="w-5 h-5" />;
      default: return <Landmark className="w-5 h-5" />;
    }
  };

  const totalBalance = accounts.reduce((acc, current) => acc + (current.balance || 0), 0);

  if (loading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Cargando cuentas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-28 md:pb-12">
      {/* Header Resumen */}
      <div className="p-6 rounded-3xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="z-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Balance Consolidado
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            ${totalBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedAccount(null);
            setIsFormOpen(true);
          }}
          className="z-10 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-black gradient-primary btn-3d w-full md:w-auto hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Grid de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="relative group p-5 rounded-3xl glass-panel flex flex-col justify-between overflow-hidden transition-all hover:bg-white/5 hover:border-white/10">
            {/* Decal Background */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none transition-all group-hover:scale-150 group-hover:opacity-30"
              style={{ backgroundColor: acc.color || "hsl(var(--primary))" }}
            />
            
            <div className="flex items-start justify-between z-10 mb-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: acc.color || "hsl(var(--primary))", color: "#fff" }}
              >
                {getIcon(acc.type)}
              </div>
              
              {/* Acciones */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount(acc);
                    setIsFormOpen(true);
                  }}
                  className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(acc.id)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="z-10">
              <p className="text-sm font-semibold text-muted-foreground truncate">{acc.name}</p>
              <p className="text-2xl font-bold tracking-tight mt-1">
                ${acc.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PiggyBank className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-bold">No tienes cuentas</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2">
            Aún no has registrado cuentas en tu billetera virtual. Agrega una cuenta para empezar a registrar movimientos.
          </p>
        </div>
      )}

      {/* Formulario Modal (Reutilizando AccountForm) */}
      {isFormOpen && (
        <AccountForm
          isOpen={isFormOpen}
          account={selectedAccount}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedAccount(null);
          }}
          onSuccess={() => {
            setIsFormOpen(false);
            setSelectedAccount(null);
            window.dispatchEvent(new Event("finance-refresh"));
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}
