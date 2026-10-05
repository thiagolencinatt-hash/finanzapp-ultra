"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Radar, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  CreditCard,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Tag,
  ChevronRight,
  Info
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { toast } from "sonner";
import type { Transaction, Subscription } from "@/lib/types";

interface DisplaySubscription {
  id?: string;
  name: string;
  category: string;
  currentAmount: number;
  previousAmount?: number;
  percentChange?: number;
  estimatedDay: number;
  currency: string;
  isDbRecord: boolean;
  notes?: string;
}

export function SubscriptionRadarCard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<DisplaySubscription | null>(null);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDay, setFormDay] = useState("10");
  const [formCategory, setFormCategory] = useState("Streaming");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const detectedServices = useMemo<DisplaySubscription[]>(() => {
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

    const results: DisplaySubscription[] = [];

    // 1. Primero incorporar las suscripciones formalmente cargadas en DB
    subscriptions.forEach((sub) => {
      const match = results.find((r) => r.name.toLowerCase() === sub.name.toLowerCase());
      if (!match) {
        results.push({
          id: sub.id,
          name: sub.name,
          category: typeof sub.category === "object" ? sub.category?.name || "Suscripción" : (sub.category || "Suscripción"),
          currentAmount: Number(sub.amount) || 0,
          estimatedDay: Number(sub.renewal_day) || 10,
          currency: sub.currency || "ARS",
          isDbRecord: true,
          notes: sub.billing_cycle === "yearly" ? "Anual" : "Mensual",
        });
      }
    });

    // 2. Analizar historial de transacciones para detectar recurrencias y aumentos
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
            id: undefined, // no está en tabla subscriptions aún
            name: service.name,
            category: service.category,
            currentAmount,
            previousAmount,
            percentChange,
            estimatedDay: day,
            currency: latest.currency || "ARS",
            isDbRecord: false,
          });
        } else {
          existing.previousAmount = previousAmount;
          existing.percentChange = percentChange;
        }
      }
    });

    // 3. Si aún no hay suficientes datos registrados, proveer servicios iniciales sugeridos
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
          isDbRecord: false,
          notes: "Plan Estándar 2 Pantallas",
        },
        {
          name: "Spotify Premium",
          category: "Música",
          currentAmount: 4399,
          previousAmount: 4399,
          percentChange: 0,
          estimatedDay: 15,
          currency: "ARS",
          isDbRecord: false,
          notes: "Plan Individual",
        },
        {
          name: "Gimnasio Pase Libre",
          category: "Salud & Deporte",
          currentAmount: 38000,
          previousAmount: 32000,
          percentChange: 18.75,
          estimatedDay: 5,
          currency: "ARS",
          isDbRecord: false,
          notes: "Pase Libre Total",
        },
      ];
    }

    return results;
  }, [transactions, subscriptions]);

  const totalMonthlyCommitment = useMemo(() => {
    return detectedServices.reduce((sum, s) => sum + s.currentAmount, 0);
  }, [detectedServices]);

  const hasHikes = detectedServices.some((s) => (s.percentChange || 0) > 0);

  // Abrir modal de edición
  const handleOpenEdit = (service: DisplaySubscription) => {
    setEditingSub(service);
    setFormName(service.name);
    setFormAmount(String(service.currentAmount));
    setFormDay(String(service.estimatedDay || 10));
    setFormCategory(service.category || "Streaming");
    setFormNotes(service.notes || "");
    setModalOpen(true);
  };

  // Abrir modal de nueva suscripción
  const handleOpenNew = () => {
    setEditingSub(null);
    setFormName("");
    setFormAmount("");
    setFormDay("10");
    setFormCategory("Streaming");
    setFormNotes("");
    setModalOpen(true);
  };

  // Guardar suscripción (POST o PUT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    const dayNum = parseInt(formDay, 10);

    if (!formName.trim()) {
      toast.error("Por favor ingresa el nombre de la suscripción");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Por favor ingresa un monto válido");
      return;
    }

    setSaving(true);
    try {
      const isEditing = editingSub && editingSub.id;
      const url = "/api/subscriptions";
      const method = isEditing ? "PUT" : "POST";
      const bodyPayload = isEditing
        ? {
            id: editingSub.id,
            name: formName.trim(),
            amount: amountNum,
            renewal_day: dayNum || 10,
            category: formCategory,
            notes: formNotes.trim(),
          }
        : {
            name: formName.trim(),
            amount: amountNum,
            renewal_day: dayNum || 10,
            category: formCategory,
            notes: formNotes.trim(),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar la suscripción");
      }

      toast.success(
        isEditing
          ? `¡Suscripción "${formName}" actualizada!`
          : `¡Suscripción "${formName}" agregada al radar!`
      );
      setModalOpen(false);
      await loadData();
      window.dispatchEvent(new CustomEvent("finance-refresh"));
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar suscripción
  const handleDelete = async () => {
    if (!editingSub) return;
    if (!editingSub.id) {
      // No está en la base de datos (era sugerencia local)
      toast.success("Suscripción removida de la vista");
      setModalOpen(false);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/subscriptions?id=${encodeURIComponent(editingSub.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("No se pudo eliminar de la base de datos");
      }
      toast.success("Suscripción eliminada con éxito");
      setModalOpen(false);
      await loadData();
      window.dispatchEvent(new CustomEvent("finance-refresh"));
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative rounded-3xl p-5 sm:p-7 bg-[#101419]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_36px_-4px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Encabezado y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <Radar className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
                Radar de Suscripciones & Gastos Fijos
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {detectedServices.length} Activos
                </span>
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                Gestión interactiva, débitos automáticos y alertas de precio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenNew}
              className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-xs font-bold text-rose-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              title="Agregar nueva suscripción o gasto recurrente"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Agregar Suscripción</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
              title="Actualizar radar"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Resumen Total de Compromiso Fijo */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/[0.08] to-purple-500/[0.08] border border-rose-500/25 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
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
              <span>Detectamos subas de precio respecto al mes anterior</span>
            </div>
          )}
        </div>

        {/* Lista de Débitos Previstos Interactivos */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-medium uppercase tracking-wider px-1">
            <span>Toca cualquier servicio para editar precio o plan</span>
            <span className="text-[10px] font-mono">Día de cobro estimado</span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {detectedServices.map((service, idx) => (
              <div
                key={service.id || idx}
                onClick={() => handleOpenEdit(service)}
                className="group relative p-3.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/10 hover:border-rose-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] group-hover:bg-rose-500/15 border border-white/10 group-hover:border-rose-500/30 text-white group-hover:text-rose-400 font-bold text-sm flex items-center justify-center shrink-0 transition-colors">
                    {service.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                        {service.name}
                      </p>
                      {service.notes && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                          {service.notes}
                        </span>
                      )}
                      {service.percentChange && service.percentChange > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          +{service.percentChange.toFixed(0)}% suba
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>Débito estimado: Día {service.estimatedDay} de cada mes</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-base font-black text-white font-mono tabular-nums">
                      {formatCurrency(service.currentAmount, service.currency, true)}
                    </p>
                    {service.previousAmount && service.previousAmount !== service.currentAmount && (
                      <p className="text-[10px] text-neutral-500 font-mono line-through">
                        Antes: {formatCurrency(service.previousAmount, service.currency, true)}
                      </p>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.1] text-neutral-400 group-hover:text-white flex items-center justify-center transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal CRUD: Editar o Crear Suscripción (Mobile Ergonomics GEL-047) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => !saving && !deleting && setModalOpen(false)} />

          <div className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl bg-neutral-950 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 animate-slide-up">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {editingSub ? "Editar Suscripción" : "Nueva Suscripción / Gasto Fijo"}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    RADAR
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  {editingSub ? "Ajusta el precio real, día de cobro o plan" : "Registra un gasto fijo para prever tus débitos"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving || deleting}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 pb-12 pr-1">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Nombre del Servicio o Débito *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Netflix, Spotify, Gimnasio, Luz"
                  className="w-full px-3.5 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Monto y Día */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Monto Mensual ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="9499"
                      className="w-full pl-8 pr-3 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Día de Débito (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    placeholder="10"
                    className="w-full px-3.5 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Categoría y Plan / Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-rose-500"
                  >
                    <option value="Streaming">Streaming (Series/Películas)</option>
                    <option value="Música">Música (Spotify, YouTube)</option>
                    <option value="Salud & Deporte">Salud & Gimnasio</option>
                    <option value="Servicios">Servicios (Internet, Luz, Gas)</option>
                    <option value="Software">Software & Cloud (iCloud, ChatGPT)</option>
                    <option value="Educación">Educación / Cursos</option>
                    <option value="Otro">Otro Gasto Fijo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Plan / Detalle (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder='Ej: "Plan Familiar", "Pase Libre"'
                    className="w-full px-3.5 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left flex items-start gap-2.5">
                <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Este importe se descontará automáticamente en tu proyección de fondos libres cada mes en el día indicado.
                </p>
              </div>

              {/* Invisible submit button to support Enter key */}
              <button type="submit" className="hidden" />
            </form>

            {/* Sticky Action Footer (GEL-047 No-Overlapping Ergonomics) */}
            <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 px-5 border-t border-white/10 flex items-center justify-between gap-3">
              {editingSub && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-bold text-rose-400 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Eliminar</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving || deleting}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-rose-400 transition-all cursor-pointer active:scale-95 shadow-lg shadow-rose-500/25 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
