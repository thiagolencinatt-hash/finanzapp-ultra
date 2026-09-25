"use client";

import { useEffect, useState, useRef } from "react";
import { CloudOff, Info, CheckCircle2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

/**
 * SyncEngine — Motor de sincronización Local-First con Supabase.
 * 
 * GEL-021 Hardening:
 * - Debounced realtime refresh to prevent rapid-fire state overwrites
 * - Never dispatch finance-refresh during initial sync if no actual changes occurred
 * - Realtime events are processed granularly (no full page destructive rebuild)
 */
export function SyncEngine() {
  const [status, setStatus] = useState<"checking" | "degraded" | "synced" | "idle">("checking");
  const [errorDetails, setErrorDetails] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const router = useRouter();
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);

  const handleExport = () => {
    try {
      const data = {
        local_transactions: JSON.parse(localStorage.getItem("local_transactions") || "[]"),
        finanzapp_last_summary: JSON.parse(localStorage.getItem("finanzapp_last_summary") || "null"),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finanzapp_local_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al exportar los datos locales.");
    }
  };

  /**
   * GEL-021: Debounced refresh to prevent race conditions.
   * Multiple rapid realtime events are coalesced into a single refresh
   * with a minimum 1.5s gap between refreshes.
   */
  const debouncedRefresh = () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // If last refresh was very recent, debounce more aggressively
    const delay = timeSinceLastRefresh < 2000 ? 1500 : 500;
    
    refreshTimeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      window.dispatchEvent(new Event("finance-refresh"));
      router.refresh();
    }, delay);
  };

  const syncLocalData = async () => {
    try {
      const localTxs = JSON.parse(localStorage.getItem("local_transactions") || "[]");
      const unsynced = localTxs.filter((t: Record<string, unknown>) => !t.synced);
      
      if (unsynced.length === 0) return false; // Changed: return false when nothing to sync

      // Sync sequentially
      let syncedCount = 0;
      for (const tx of unsynced) {
        try {
          const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: tx.type,
              amount: tx.amount,
              description: tx.description,
              date: tx.date,
              account_id: tx.account_id !== "ai-generated" ? tx.account_id : undefined,
              category_id: tx.category_id,
            }),
          });
          if (res.ok) {
            tx.synced = true;
            syncedCount++;
          }
        } catch (err) {
          console.warn("Error syncing transaction:", tx, err);
        }
      }

      // Update local storage with new statuses
      localStorage.setItem("local_transactions", JSON.stringify(localTxs));
      
      if (syncedCount > 0) {
        // GEL-021: Use debounced refresh instead of immediate to prevent race condition
        debouncedRefresh();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Sync error", err);
      return false;
    }
  };

  const setupRealtime = (supabaseUrl: string, supabaseKey: string) => {
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const channel = supabase
      .channel('finance-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log("[SyncEngine] Realtime transaction event:", payload.eventType);
          // GEL-021: Debounced refresh instead of immediate to prevent blank state
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        (payload) => {
          console.log("[SyncEngine] Realtime account event:", payload.eventType);
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    let unsubscribeRealtime: (() => void) | undefined;

    fetch("/api/health")
      .then((res) => res.json())
      .then(async (data) => {
        if (data.status === "degraded") {
          setStatus("degraded");
          let details = "Faltan variables en el entorno:\n";
          if (!data.envCheck.NEXT_PUBLIC_SUPABASE_URL) details += "- NEXT_PUBLIC_SUPABASE_URL\n";
          if (!data.envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY) details += "- NEXT_PUBLIC_SUPABASE_ANON_KEY\n";
          if (!data.envCheck.SUPABASE_SERVICE_ROLE_KEY) details += "- SUPABASE_SERVICE_ROLE_KEY\n";
          if (!data.dbPing) details += `\nError de conexión a DB: ${data.error || "Desconocido"}`;
          setErrorDetails(details);
        } else {
          // Healthy!
          setStatus("synced");
          const didSync = await syncLocalData();
          
          if (didSync) {
            setShowSyncedToast(true);
            setTimeout(() => setShowSyncedToast(false), 3500);
          }

          // Inicializar realtime
          if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            unsubscribeRealtime = setupRealtime(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
          }
        }
      })
      .catch(() => {
        setStatus("degraded");
        setErrorDetails("No se pudo contactar con /api/health");
      });

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
      // GEL-021: Clean up pending debounce timers
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [router]);

  if (status === "checking" || status === "idle") return null;

  return (
    <>
      {status === "degraded" && (
        <div 
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 z-50 bg-amber-500/20 border border-amber-500/50 text-amber-500 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 shadow-lg backdrop-blur-md animate-pulse hover:bg-amber-500/30 transition-colors"
        >
          <CloudOff className="w-4 h-4" />
          Modo Local Activo (Nube Desconectada)
        </div>
      )}

      {showSyncedToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4" />
          Nube Sincronizada 🟢
        </div>
      )}

      {showModal && status === "degraded" && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <Info className="w-6 h-6" />
              <h3 className="font-bold">Información de Nube</h3>
            </div>
            <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
              <strong>Modo Local Seguro:</strong> Tus datos están a salvo en este dispositivo. Para activar el respaldo en la nube, ejecuta el <a href="/api/setup-db" target="_blank" className="text-emerald-400 underline hover:text-emerald-300">script SQL en Supabase</a> o agrega las claves faltantes.
            </p>
            <pre className="text-xs bg-black p-3 rounded-lg text-red-400 whitespace-pre-wrap font-mono mb-6 border border-zinc-800 max-h-32 overflow-y-auto custom-scrollbar">
              {errorDetails}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Exportar Respaldo
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
