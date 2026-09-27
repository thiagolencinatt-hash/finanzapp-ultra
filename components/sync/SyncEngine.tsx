"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CloudOff, Info, CheckCircle2, Wifi } from "lucide-react";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { normalizeTransaction } from "@/lib/utils/normalize-transaction";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * SyncEngine v2 — Motor de Sincronización Multi-Dispositivo en Tiempo Real
 * 
 * GEL-022: Resolución integral de la sincronización PC <-> Móvil.
 * 
 * Arquitectura:
 * 1. Al montar, intenta sincronizar transacciones locales (unsynced) hacia Supabase.
 * 2. Suscribe un canal Supabase Realtime escuchando INSERT/UPDATE/DELETE
 *    en transactions, accounts, category_budgets y savings_goals.
 * 3. Al recibir un evento remoto:
 *    a) Parsea y normaliza la data del payload.
 *    b) Actualiza DIRECTAMENTE el localStorage del dispositivo receptor.
 *    c) Despacha el evento DOM `finance-refresh` para que React re-renderice.
 *    d) Llama a `router.refresh()` para invalidar el cache del App Router (SSR).
 * 4. Maneja reconexión en móviles: al volver al primer plano
 *    (visibilitychange/focus), verifica el estado del canal WebSocket
 *    y ejecuta una re-sincronización diferencial rápida.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────
const DEBOUNCE_MIN_GAP_MS = 800;
const DEBOUNCE_AGGRESSIVE_MS = 1200;
const DEBOUNCE_NORMAL_MS = 300;
const VISIBILITY_RESYNC_COOLDOWN_MS = 3000;
const LOG_PREFIX = "[SyncEngine]";

export function SyncEngine() {
  const [status, setStatus] = useState<"checking" | "degraded" | "synced" | "idle">("checking");
  const [errorDetails, setErrorDetails] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const router = useRouter();

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastVisibilityResyncRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // ─── Debounced Refresh ────────────────────────────────────────────────────
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const delay = timeSinceLastRefresh < DEBOUNCE_MIN_GAP_MS
      ? DEBOUNCE_AGGRESSIVE_MS
      : DEBOUNCE_NORMAL_MS;

    refreshTimeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      console.log(`${LOG_PREFIX} Dispatching finance-refresh + router.refresh()`);
      window.dispatchEvent(new Event("finance-refresh"));
      router.refresh();
    }, delay);
  }, [router]);

  // ─── localStorage Helpers ─────────────────────────────────────────────────

  /**
   * Actualiza localStorage con una transacción recibida por Realtime.
   * Esto es lo que cierra el "puente roto": el dispositivo remoto ahora
   * tiene los datos en su almacenamiento local ANTES de que React re-renderice.
   */
  const injectRemoteTransactionToLocal = useCallback(
    (eventType: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      try {
        const localRaw = localStorage.getItem("local_transactions");
        const localTxs: Record<string, unknown>[] = localRaw ? JSON.parse(localRaw) : [];

        if (eventType === "INSERT") {
          const newRecord = payload.new as Record<string, unknown>;
          if (!newRecord || !newRecord.id) return;

          // Evitar duplicados por ID
          const existingIdx = localTxs.findIndex((t: any) => t.id === newRecord.id);
          if (existingIdx >= 0) {
            // Ya existe — actualizar en lugar de duplicar
            localTxs[existingIdx] = { ...newRecord, synced: true };
          } else {
            // Insertar al principio (más reciente primero)
            localTxs.unshift({ ...newRecord, synced: true });
          }

          console.log(`${LOG_PREFIX} INSERT → localStorage actualizado. ID: ${newRecord.id}`);
        } else if (eventType === "UPDATE") {
          const updatedRecord = payload.new as Record<string, unknown>;
          if (!updatedRecord || !updatedRecord.id) return;

          const idx = localTxs.findIndex((t: any) => t.id === updatedRecord.id);
          if (idx >= 0) {
            localTxs[idx] = { ...updatedRecord, synced: true };
          } else {
            localTxs.unshift({ ...updatedRecord, synced: true });
          }

          console.log(`${LOG_PREFIX} UPDATE → localStorage actualizado. ID: ${updatedRecord.id}`);
        } else if (eventType === "DELETE") {
          const oldRecord = payload.old as Record<string, unknown>;
          if (!oldRecord || !oldRecord.id) return;

          const filtered = localTxs.filter((t) => t.id !== oldRecord.id);
          localStorage.setItem("local_transactions", JSON.stringify(filtered));
          console.log(`${LOG_PREFIX} DELETE → Transacción removida de localStorage. ID: ${oldRecord.id}`);
          return; // Ya guardamos, salir
        }

        localStorage.setItem("local_transactions", JSON.stringify(localTxs));
      } catch (err) {
        console.warn(`${LOG_PREFIX} Error actualizando localStorage para evento ${eventType}:`, err);
      }
    },
    []
  );

  /**
   * Invalida el cache de summary en localStorage para forzar recarga fresca.
   */
  const invalidateSummaryCache = useCallback(() => {
    try {
      localStorage.removeItem("finanzapp_last_summary");
      console.log(`${LOG_PREFIX} Summary cache invalidado`);
    } catch {
      // ignore
    }
  }, []);

  // ─── Hydrate from Cloud (Cold Start) ──────────────────────────────────────
  const hydrateFromCloud = useCallback(async () => {
    try {
      console.log(`${LOG_PREFIX} 📥 Iniciando hidratación en frío (Cold Start)...`);
      
      const [resTxs, resAccs, resBudgets, resGoals] = await Promise.all([
        fetch("/api/transactions", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/budgets", { cache: "no-store" }),
        fetch("/api/goals", { cache: "no-store" })
      ]);
      
      if (resTxs.ok) {
        const resJson = await resTxs.json();
        const txs = Array.isArray(resJson) ? resJson : (Array.isArray(resJson?.data) ? resJson.data : []);
        if (Array.isArray(txs)) {
          // Obtener actuales para no pisar las locales no sincronizadas que tengan IDs temporales
          const currentTxsStr = localStorage.getItem("local_transactions");
          const currentTxs = currentTxsStr ? JSON.parse(currentTxsStr) : [];
          const remoteTxs = txs.map((t: any) => ({ ...t, synced: true }));
          
          // Deduplicar: mantener los locales (optimistic) si ya existen, y sobreescribir con la versión remota
          const txMap = new Map();
          currentTxs.forEach((t: any) => txMap.set(t.id, t));
          remoteTxs.forEach((t: any) => txMap.set(t.id, t));
          
          const mergedTxs = Array.from(txMap.values());
          // Ordenar por fecha descendente
          mergedTxs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          localStorage.setItem("local_transactions", JSON.stringify(mergedTxs));
        }
      }
      
      if (resAccs.ok) {
        const accs = await resAccs.json();
        if (Array.isArray(accs)) {
          localStorage.setItem("local_accounts", JSON.stringify(accs));
        }
      }

      if (resBudgets.ok) {
        const budgets = await resBudgets.json();
        if (Array.isArray(budgets)) {
          localStorage.setItem("local_budgets", JSON.stringify(budgets));
        }
      }

      if (resGoals.ok) {
        const goals = await resGoals.json();
        if (Array.isArray(goals)) {
          localStorage.setItem("local_goals", JSON.stringify(goals));
        }
      }
      
      invalidateSummaryCache();
      
      console.log(`${LOG_PREFIX} ✅ Hidratación en frío completada`);
      window.dispatchEvent(new CustomEvent("finance-refresh", { detail: { source: "cloud_hydration" } }));
      router.refresh();
      
    } catch (err) {
      console.warn(`${LOG_PREFIX} Error durante la hidratación en frío:`, err);
    }
  }, [invalidateSummaryCache, router]);

  // ─── Sync Local Unsynced Data to Cloud ────────────────────────────────────
  const syncLocalData = useCallback(async () => {
    try {
      const localTxs = JSON.parse(localStorage.getItem("local_transactions") || "[]");
      const unsynced = localTxs.filter((t: Record<string, unknown>) => !t.synced);

      if (unsynced.length === 0) return false;

      console.log(`${LOG_PREFIX} Sincronizando ${unsynced.length} transacciones locales a la nube...`);

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
          console.warn(`${LOG_PREFIX} Error syncing tx:`, tx.id, err);
        }
      }

      localStorage.setItem("local_transactions", JSON.stringify(localTxs));

      if (syncedCount > 0) {
        console.log(`${LOG_PREFIX} ✅ ${syncedCount} transacciones sincronizadas exitosamente`);
        debouncedRefresh();
        return true;
      }
      return false;
    } catch (err) {
      console.error(`${LOG_PREFIX} Error en syncLocalData:`, err);
      return false;
    }
  }, [debouncedRefresh]);

  // ─── Full Re-Sync (Differential) ─────────────────────────────────────────
  /**
   * Re-sincronización completa cuando el móvil vuelve al primer plano.
   * Descarga los datos frescos de la nube y refresca la UI.
   */
  const fullResync = useCallback(async () => {
    const now = Date.now();
    if (now - lastVisibilityResyncRef.current < VISIBILITY_RESYNC_COOLDOWN_MS) {
      console.log(`${LOG_PREFIX} Re-sync skipped (cooldown activo)`);
      return;
    }
    lastVisibilityResyncRef.current = now;

    console.log(`${LOG_PREFIX} 🔄 Re-sincronización diferencial iniciada (visibilitychange/focus)`);

    try {
      // Primero subir datos locales pendientes
      await syncLocalData();

      // Invalidar summary cache para forzar datos frescos
      invalidateSummaryCache();

      // Forzar re-render de toda la UI con datos frescos del servidor
      lastRefreshRef.current = Date.now();
      window.dispatchEvent(new Event("finance-refresh"));
      router.refresh();

      console.log(`${LOG_PREFIX} ✅ Re-sincronización completada`);
    } catch (err) {
      console.warn(`${LOG_PREFIX} Error en fullResync:`, err);
    }
  }, [syncLocalData, invalidateSummaryCache, router]);

  // ─── Realtime Channel Setup ───────────────────────────────────────────────
  const setupRealtime = useCallback(() => {
    if (!isSupabaseConfigured()) {
      console.warn(`${LOG_PREFIX} Supabase no configurado, Realtime deshabilitado`);
      return;
    }

    const supabase = createBrowserSupabase();

    console.log(`${LOG_PREFIX} 🔌 Configurando canal Realtime...`);

    const channel = supabase
      .channel("finance-realtime-sync", {
        config: { broadcast: { self: false } },
      })
      // ─── Transactions ───
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          console.log(`${LOG_PREFIX} 📥 Realtime INSERT en transactions:`, payload.new);
          injectRemoteTransactionToLocal("INSERT", payload);
          invalidateSummaryCache();
          debouncedRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions" },
        (payload) => {
          console.log(`${LOG_PREFIX} 📝 Realtime UPDATE en transactions:`, payload.new);
          injectRemoteTransactionToLocal("UPDATE", payload);
          invalidateSummaryCache();
          debouncedRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "transactions" },
        (payload) => {
          console.log(`${LOG_PREFIX} 🗑️ Realtime DELETE en transactions:`, payload.old);
          injectRemoteTransactionToLocal("DELETE", payload);
          invalidateSummaryCache();
          debouncedRefresh();
        }
      )
      // ─── Accounts ───
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        (payload) => {
          console.log(`${LOG_PREFIX} 🏦 Realtime evento en accounts:`, payload.eventType);
          invalidateSummaryCache();
          debouncedRefresh();
        }
      )
      // ─── Budgets ───
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "category_budgets" },
        (payload) => {
          console.log(`${LOG_PREFIX} 📊 Realtime evento en budgets:`, payload.eventType);
          debouncedRefresh();
        }
      )
      // ─── Savings Goals ───
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "savings_goals" },
        (payload) => {
          console.log(`${LOG_PREFIX} 🎯 Realtime evento en goals:`, payload.eventType);
          debouncedRefresh();
        }
      )
      .subscribe((status, err) => {
        console.log(`${LOG_PREFIX} Canal Realtime status: ${status}`, err || "");
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
          console.log(`${LOG_PREFIX} ✅ Realtime conectado y escuchando cambios en tiempo real`);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeConnected(false);
          console.error(`${LOG_PREFIX} ❌ Error en canal Realtime: ${status}`, err);
        } else if (status === "CLOSED") {
          setRealtimeConnected(false);
          console.warn(`${LOG_PREFIX} Canal Realtime cerrado`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`${LOG_PREFIX} Desuscribiendo canal Realtime`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [injectRemoteTransactionToLocal, invalidateSummaryCache, debouncedRefresh]);

  // ─── Visibility & Focus Handlers (Mobile Reconnect) ───────────────────────
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      console.log(`${LOG_PREFIX} 📱 App volvió al primer plano (visibilitychange)`);
      fullResync();
    }
  }, [fullResync]);

  const handleFocusChange = useCallback(() => {
    console.log(`${LOG_PREFIX} 📱 Ventana recibió focus`);
    fullResync();
  }, [fullResync]);

  // ─── Export Handler ───────────────────────────────────────────────────────
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
    } catch {
      alert("Error al exportar los datos locales.");
    }
  };

  // ─── Main Effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    let unsubscribeRealtime: (() => void) | undefined;

    console.log(`${LOG_PREFIX} 🚀 Inicializando SyncEngine v2...`);

    fetch("/api/health")
      .then((res) => res.json())
      .then(async (data) => {
        if (!isMountedRef.current) return;

        if (data.status === "degraded") {
          setStatus("degraded");
          let details = "Faltan variables en el entorno:\n";
          if (!data.envCheck?.NEXT_PUBLIC_SUPABASE_URL) details += "- NEXT_PUBLIC_SUPABASE_URL\n";
          if (!data.envCheck?.NEXT_PUBLIC_SUPABASE_ANON_KEY) details += "- NEXT_PUBLIC_SUPABASE_ANON_KEY\n";
          if (!data.envCheck?.SUPABASE_SERVICE_ROLE_KEY) details += "- SUPABASE_SERVICE_ROLE_KEY\n";
          if (!data.dbPing) details += `\nError de conexión a DB: ${data.error || "Desconocido"}`;
          setErrorDetails(details);
          console.warn(`${LOG_PREFIX} ⚠️ Modo degradado:`, details);
        } else {
          setStatus("synced");
          console.log(`${LOG_PREFIX} ✅ Health check OK. Iniciando sync...`);

          // Sincronizar datos locales pendientes
          const didSync = await syncLocalData();
          if (didSync && isMountedRef.current) {
            setShowSyncedToast(true);
            setTimeout(() => {
              if (isMountedRef.current) setShowSyncedToast(false);
            }, 3500);
          }

          // Ejecutar hidratación inicial desde la nube
          if (isMountedRef.current) {
            await hydrateFromCloud();
          }

          // Inicializar Realtime WebSocket
          unsubscribeRealtime = setupRealtime();
        }
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        setStatus("degraded");
        setErrorDetails("No se pudo contactar con /api/health");
        console.error(`${LOG_PREFIX} ❌ Health check falló:`, err);
      });

    // ─── Listeners de reconexión para móviles ───
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocusChange);

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocusChange);
      console.log(`${LOG_PREFIX} 🔌 SyncEngine desmontado y limpiado`);
    };
  }, [syncLocalData, setupRealtime, handleVisibilityChange, handleFocusChange, hydrateFromCloud]);

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

      {/* Indicador de Realtime conectado (sutil, esquina inferior) */}
      {status === "synced" && realtimeConnected && !showSyncedToast && (
        <div className="fixed bottom-4 right-4 z-40 text-emerald-500/60 px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 select-none pointer-events-none">
          <Wifi className="w-3 h-3" />
          Realtime
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
