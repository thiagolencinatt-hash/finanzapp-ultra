"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Radar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  CreditCard,
  RefreshCw,
  Plus
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { Transaction, Subscription } from "@/lib/types";

interface DetectedService {
  name: string;
  category: string;
  currentAmount: number;
  previousAmount?: number;
  percentChange?: number;
  estimatedDay: number;
  currency: string;
  isGhostExpense?: boolean;
}

export function SubscriptionRadarCard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resTrans, resSubs] = await Promise.all([
        fetch("/api/transactions", { cache: "no-store" }),
        fetch("/api/subscriptions", { cache: "no-store" }),
      ]);

      if (resTrans.ok) {
        const data = await resTrans.json();
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        } else if (Array.isArray(data)) {
          setTransactions(data);
        }
      }

      if (resSubs.ok) {
        const data = await resSubs.json();
        if (Array.isArray(data.subscriptions)) {
          setSubscriptions(data.subscriptions);
        } else if (Array.isArray(data)) {
          setSubscriptions(data);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener("finance-refresh", handleRefresh);
    return () => window.removeEventListener("finance-refresh", handleRefresh);
  }, []);

  // Radar de detección automática de suscripciones recurrentes y subas de precio
  const detectedServices = useMemo<DetectedService[]>(() => {
    const KNOWN_SERVICES = [
      { regex: /netflix/i, name: "Netflix", category: "Streaming" },
      { regex: /spotify/i, name: "Spotify", category: "Música" },
      { regex: /youtube/i, name: "YouTube Premium", category: "Streaming" },
      { regex: /disney|star\+/i, name: "Disney+ / Star+", category: "Streaming" },
      { regex: /amazon|prime/i, name: "Amazon Prime", category: "Streaming" },
      { regex: /hbo|max/i, name: "Max (HBO)", category: "Streaming" },
      { regex: /apple|icloud/i, name: "Apple iCloud", category: "Cloud" },
      { regex: /chatgpt|openai/i, name: "ChatGPT Plus", category: "Software" },
      { regex: /gym|smartfit|sportclub/i, name: "Gimnasio / Cuota Social", category: "Salud" },
      { regex: /flow|telecentro|fibertel|personal/i, name: "Internet & Telefonía", category: "Servicios" },
      { regex: /edenor|edesur|metrogas|aysa/i, name: "Servicios Básicos (Luz/Gas/Agua)", category: "Hogar" },
    ];

    const results: DetectedService[] = [];

    // Primero incorporar las suscripciones formalmente cargadas
    subscriptions.forEach((sub) => {
      const match = results.find((r) => r.name.toLowerCase() === sub.name.toLowerCase());
      if (!match) {
        results.push({
          name: sub.name,
          category: typeof sub.category === "object" ? sub.category?.name || "Suscripción" : (sub.category || "Suscripción"),
          currentAmount: Number(sub.amount) || 0,
          estimatedDay: Number(sub.renewal_day) || 10,
          currency: sub.currency || "ARS",
        });
      }
    });

    // Analizar historial de transacciones para detectar recurrencias y aumentos
    KNOWN_SERVICES.forEach((service) => {
      const matches = transactions
        .filter((t) => t.type === "expense" && t.description && service.regex.test(t.description))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (matches.length > 0) {
        const latest = matches[0];
        const previous = matches[1];

        const existing = results.find((r) => r.name.toLowerCase() === service.name.toLowerCase());
        const day = new Date(latest.date).getDate() || 10;
        const currentAmount = Number(latest.amount);
        const previousAmount = previous ? Number(previous.amount) : undefined;
        let percentChange: number | undefined;

        if (previousAmount && previousAmount > 0 && currentAmount !== previousAmount) {
          percentChange = ((currentAmount - previousAmount) / previousAmount) * 100;
        }

        if (!existing) {
          results.push({
            name: service.name,
            category: service.category,
            currentAmount,
            previousAmount,
            percentChange,
            estimatedDay: day,
            currency: latest.currency || "ARS",
            isGhostExpense: matches.length >= 2,
          });
        } else {
          existing.previousAmount = previousAmount;
          existing.percentChange = percentChange;
        }
      }
    });

    // Si aún no hay suficientes datos registrados, proveer demo de suscripciones típicas
    if (results.length === 0) {
      return [
        {
          name: "Netflix Standard",
          category: "Streaming",
          currentAmount: 9499,
          previousAmount: 7999,
          percentChange: 18.7,
          estimatedDay: 8,
          currency: "ARS",
        },
        {
          name: "Spotify Premium",
          category: "Música",
          currentAmount: 4399,
          previousAmount: 4399,
          percentChange: 0,
          estimatedDay: 15,
          currency: "ARS",
        },
        {
          name: "Gimnasio Pase Libre",
          category: "Salud & Deporte",
          currentAmount: 38000,
          previousAmount: 32000,
          percentChange: 18.75,
          estimatedDay: 5,
          currency: "ARS",
        },
        {
          name: "iCloud 200GB",
          category: "Almacenamiento",
          currentAmount: 3200,
          previousAmount: 3200,
          percentChange: 0,
          estimatedDay: 22,
          currency: "ARS",
        },
      ];
    }

    return results;
  }, [transactions, subscriptions]);

  const totalMonthlyCommitment = useMemo(() => {
    return detectedServices.reduce((sum, s) => sum + s.currentAmount, 0);
  }, [detectedServices]);

  const hasHikes = detectedServices.some((s) => (s.percentChange || 0) > 0);

  return (
    <div className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-neutral-900/80 to-neutral-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
            <Radar className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
              Radar de Suscripciones & Débitos
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {detectedServices.length} Activas
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              Control de débitos automáticos y detección de aumentos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Actualizar radar"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden xs:inline">Escanear</span>
        </button>
      </div>

      {/* Resumen Total de Compromiso Fijo */}
      <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Compromiso Fijo Mensual Estimado
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
            {formatCurrency(totalMonthlyCommitment, "ARS", true)}
            <span className="text-xs text-neutral-400 font-normal"> / mes</span>
          </p>
        </div>

        {hasHikes && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold self-start sm:self-auto">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Detectamos incrementos de precio este mes</span>
          </div>
        )}
      </div>

      {/* Lista de Débitos Previstos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-medium uppercase tracking-wider px-1">
          <span>Servicios & Débitos Automáticos</span>
          <span className="text-[10px] font-mono">Día de cobro estimado</span>
        </div>

        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {detectedServices.map((service, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-neutral-900/70 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {service.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{service.name}</p>
                    {service.percentChange && service.percentChange > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        +{service.percentChange.toFixed(0)}% vs mes anterior
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-neutral-500" />
                    <span>Se cobra aprox. el día {service.estimatedDay} del mes</span>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-base font-black text-white font-mono tabular-nums">
                  {formatCurrency(service.currentAmount, service.currency, true)}
                </p>
                {service.previousAmount && service.previousAmount !== service.currentAmount && (
                  <p className="text-[10px] text-neutral-500 font-mono line-through">
                    Antes: {formatCurrency(service.previousAmount, service.currency, true)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
