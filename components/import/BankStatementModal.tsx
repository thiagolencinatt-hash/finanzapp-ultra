"use client";

import { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Wallet,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import { parseBankStatementBuffer, ParsedStatementTransaction } from "@/lib/import/statement-parser";
import type { Account, Category } from "@/lib/types";

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialBank?: string;
}

export function BankStatementModal({ isOpen, onClose, onSuccess, initialBank }: BankStatementModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<{
    detectedBank: string;
    transactions: ParsedStatementTransaction[];
    totalIncome: number;
    totalExpense: number;
    initialBalance?: number | null;
    finalBalance?: number | null;
    period?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/accounts").then((r) => r.json()).catch(() => []),
        fetch("/api/categories").then((r) => r.json()).catch(() => []),
      ]).then(([accs, cats]) => {
        if (Array.isArray(accs) && accs.length > 0) {
          setAccounts(accs);
          if (initialBank) {
            const matched = accs.find((a) =>
              a.name.toLowerCase().includes(initialBank.toLowerCase()) ||
              initialBank.toLowerCase().includes(a.name.toLowerCase())
            );
            if (matched) {
              setSelectedAccountId(matched.id);
              return;
            }
          }
          const defaultAcc = accs.find((a) => a.name.toLowerCase().includes("mercado") || a.name.toLowerCase().includes("banco")) || accs[0];
          setSelectedAccountId(defaultAcc.id);
        }
        if (Array.isArray(cats)) {
          setCategories(cats);
        }
      });
    } else {
      // Reset state on close
      setFile(null);
      setParsedData(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen, initialBank]);

  if (!isOpen) return null;

  async function handleFileProcess(selectedFile: File) {
    setError(null);
    setFile(selectedFile);
    setParsing(true);

    try {
      // 1. Enviar al endpoint con soporte de Gemini para PDF/Imágenes y Parser para Excel/CSV
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/import/statement", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se detectaron movimientos legibles. Intenta con una captura más nítida o el PDF oficial.");
      }

      if (!data.transactions || data.transactions.length === 0) {
        throw new Error("No se detectaron movimientos legibles. Intenta con una captura más nítida o el PDF oficial.");
      }

      setParsedData({
        detectedBank: data.detectedBank || "Extracto Bancario",
        transactions: data.transactions,
        totalIncome: data.totalIncome || 0,
        totalExpense: data.totalExpense || 0,
        initialBalance: data.initialBalance !== undefined ? data.initialBalance : null,
        finalBalance: data.finalBalance !== undefined ? data.finalBalance : null,
        period: data.period || null,
      });

      // Auto-seleccionar la cuenta que coincida con el banco detectado o initialBank
      const targetBank = initialBank || data.detectedBank;
      if (targetBank && accounts.length > 0) {
        const match = accounts.find((a) =>
          a.name.toLowerCase().includes(targetBank.toLowerCase()) ||
          targetBank.toLowerCase().includes(a.name.toLowerCase()) ||
          (targetBank.toLowerCase().includes("mercado") && a.name.toLowerCase().includes("mercado"))
        );
        if (match) setSelectedAccountId(match.id);
      }

      toast.success(`¡Lectura exitosa! Se encontraron ${data.transactions.length} movimientos.`);
    } catch (err: any) {
      console.warn("API import error, checking spreadsheet fallback:", err);
      // Fallback local en caso de que sea CSV/Excel
      const isSpreadsheet = selectedFile.name.match(/\.(csv|xlsx|xls)$/i);
      if (isSpreadsheet) {
        try {
          const buffer = await selectedFile.arrayBuffer();
          const localResult = parseBankStatementBuffer(buffer);
          if (!localResult.error && localResult.transactions.length > 0) {
            setParsedData({
              detectedBank: localResult.detectedBank,
              transactions: localResult.transactions,
              totalIncome: localResult.totalIncome,
              totalExpense: localResult.totalExpense,
              initialBalance: localResult.initialBalance || null,
              finalBalance: localResult.finalBalance || null,
              period: localResult.period || null,
            });
            toast.success(`¡Detectado ${localResult.detectedBank}! Se encontraron ${localResult.transactions.length} movimientos.`);
            return;
          }
        } catch {
          // ignore
        }
      }
      setError(err.message || "No se detectaron movimientos legibles. Intenta con una captura más nítida o el PDF oficial.");
      setParsedData(null);
    } finally {
      // SIEMPRE resetear el input para que el usuario pueda volver a seleccionarlo sin congelarse
      if (fileInputRef.current) fileInputRef.current.value = "";
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  }

  function toggleSelectAll(select: boolean) {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      transactions: parsedData.transactions.map((t) => ({ ...t, selected: select })),
    });
  }

  function toggleRow(id: string) {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      transactions: parsedData.transactions.map((t) =>
        t.id === id ? { ...t, selected: !t.selected } : t
      ),
    });
  }

  async function handleExecuteImport() {
    if (!parsedData) return;
    const toImport = parsedData.transactions.filter((t) => t.selected);

    if (toImport.length === 0) {
      toast.error("Seleccioná al menos un movimiento para importar.");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Seleccioná la cuenta donde se registrarán los movimientos.");
      return;
    }

    setImporting(true);
    try {
      const payload = toImport.map((tx) => {
        // Encontrar category_id si coincide
        const catMatch = categories.find((c) =>
          c.name.toLowerCase().includes(tx.suggestedCategory.toLowerCase()) ||
          tx.suggestedCategory.toLowerCase().includes(c.name.toLowerCase())
        );

        return {
          account_id: selectedAccountId,
          amount: tx.amount,
          type: tx.type,
          category_id: catMatch ? catMatch.id : null,
          category: tx.suggestedCategory,
          description: tx.description,
          date: tx.date,
          currency: "ARS",
        };
      });

      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: payload,
          accountId: selectedAccountId,
          initialBalance: parsedData.initialBalance,
          finalBalance: parsedData.finalBalance,
          period: parsedData.period,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al importar movimientos");
      }

      toast.success(`🎉 ${toImport.length} movimientos importados exitosamente.`);
      window.dispatchEvent(new Event("finance-refresh"));
      onSuccess?.();
      onClose();

      // Recarga limpia para que Supabase actualice saldos y dashboard al instante
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (err: any) {
      console.error("Error executing import:", err);
      toast.error(err.message || "Error al importar movimientos.");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = parsedData ? parsedData.transactions.filter((t) => t.selected).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog: max-h-[82dvh] con margen superior para no cortarse con la barra de estado */}
      <div 
        className="relative w-full max-w-3xl max-h-[82dvh] sm:max-h-[85vh] mt-12 sm:mt-0 flex flex-col rounded-t-3xl sm:rounded-3xl bg-zinc-950 border-t border-x sm:border border-white/[0.1] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10"
      >
        {/* Handle pill para móvil */}
        <div className="w-12 h-1.5 bg-neutral-600 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Encabezado fijo y siempre visible */}
        <div className="sticky top-0 bg-neutral-900 z-10 px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {initialBank ? `Cargar Extracto de ${initialBank}` : "Cargar Extracto / Comprobante"}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PDF / IA
                </span>
              </h2>
              <p className="text-sm text-neutral-300 mt-0.5">
                Soporta PDF de Mercado Pago, capturas de pantalla o planillas Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {!parsedData ? (
            /* Upload State */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.15] hover:border-emerald-500/50 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center justify-center gap-4 transition-all cursor-pointer bg-white/[0.02] hover:bg-emerald-500/[0.03] group active:scale-[0.99]"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.05] group-hover:bg-emerald-500/15 text-zinc-300 group-hover:text-emerald-400 flex items-center justify-center transition-all border border-white/[0.08] group-hover:border-emerald-500/30">
                  {parsing ? (
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1.5 max-w-md">
                  <p className="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                    {parsing ? "Analizando comprobantes o extracto con IA..." : "Toca aquí para seleccionar PDF, Imagen o Excel"}
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Formatos soportados: <span className="text-emerald-400 font-semibold">PDF de Mercado Pago</span>, capturas de pantalla, fotos o planillas Excel / CSV
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls,.tsv,application/pdf,image/*"
                  className="hidden"
                />
              </div>

              {/* Supported Platforms Badges */}
              <div className="rounded-2xl p-4 bg-zinc-900/40 border border-white/[0.06] space-y-2">
                <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" /> Bancos y plataformas auto-detectadas
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Mercado Pago (PDF / Captura)", "Banco Santander", "Banco Galicia", "BBVA", "Brubank", "Lemon Cash", "Ualá", "Excel / CSV"].map((bank) => (
                    <span
                      key={bank}
                      className="px-3 py-1 rounded-xl bg-white/[0.04] text-zinc-200 border border-white/[0.08] text-xs font-medium"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>

              {/* Alerta de Error en pantalla visible */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-100">No se pudieron extraer transacciones</p>
                    <p className="text-sm text-rose-200/90 leading-relaxed">{error}</p>
                    <p className="text-xs text-rose-300/70 pt-1">
                      Tip: Asegúrate de que el documento no esté borroso y contenga importes y fechas legibles.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview & Confirm State (Tarjetas Individuales Ergonómicas) */
            <div className="space-y-4">
              {/* Info Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-bold text-zinc-400">Origen detectado</p>
                    <p className="text-sm sm:text-base font-extrabold text-zinc-100">{parsedData.detectedBank}</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-bold text-zinc-400">Ingresos detectados</p>
                    <p className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">
                      {formatCurrency(parsedData.totalIncome, "ARS", true)}
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase font-bold text-zinc-400">Gastos detectados</p>
                    <p className="text-base sm:text-lg font-extrabold text-rose-400 font-mono">
                      {formatCurrency(parsedData.totalExpense, "ARS", true)}
                    </p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
              </div>

              {/* Banner de Conciliación de Saldo Auditado (GEL-046) */}
              {parsedData.finalBalance !== undefined && parsedData.finalBalance !== null && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">
                          Conciliación Oficial de Saldo
                        </p>
                        {parsedData.period && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.08]">
                            {parsedData.period}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 mt-0.5">
                        {parsedData.initialBalance !== null && parsedData.initialBalance !== undefined ? (
                          <span>
                            Saldo inicial: <strong className="font-mono text-zinc-300">{formatCurrency(parsedData.initialBalance)}</strong> •{" "}
                          </span>
                        ) : null}
                        Saldo final oficial:{" "}
                        <strong className="font-mono text-emerald-300 font-extrabold text-sm sm:text-base">
                          {formatCurrency(parsedData.finalBalance ?? 0)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    ✓ Balance Anclado
                  </span>
                </div>
              )}

              {/* Account Selector */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-zinc-200">Asignar a cuenta de destino:</span>
                </div>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="px-3.5 h-11 rounded-xl bg-zinc-950 border border-white/[0.1] text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-neutral-900">
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action row with select all */}
              <div className="flex items-center justify-between text-sm text-zinc-300 px-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="hover:text-emerald-400 underline font-semibold cursor-pointer"
                  >
                    Seleccionar todos
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="hover:text-rose-400 underline font-semibold cursor-pointer"
                  >
                    Deseleccionar todos
                  </button>
                </div>
                <div className="font-bold text-zinc-100">
                  {selectedCount} de {parsedData.transactions.length} seleccionados
                </div>
              </div>

              {/* Lista de Tarjetas Individuales (Escalado visual táctil) */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {parsedData.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => toggleRow(tx.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      tx.selected
                        ? "bg-white/[0.04] border-white/15 hover:border-emerald-500/40 shadow-sm"
                        : "bg-white/[0.01] border-white/5 opacity-40 hover:opacity-75"
                    }`}
                  >
                    {/* Checkbox grande 24x24px */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={tx.selected}
                        onChange={() => toggleRow(tx.id)}
                        className="w-6 h-6 rounded-lg border-2 border-zinc-600 text-emerald-500 focus:ring-emerald-500 shrink-0 cursor-pointer accent-emerald-500"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-medium text-zinc-100 truncate" title={tx.description}>
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono text-zinc-400">{tx.date}</span>
                          {tx.suggestedCategory && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 border border-white/10">
                              {tx.suggestedCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Monto y Badge */}
                    <div className="text-right shrink-0 space-y-1">
                      <p className={`text-lg font-bold font-mono tabular-nums ${
                        tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, "ARS", true)}
                      </p>
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        tx.type === "income"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      }`}>
                        {tx.type === "income" ? "Ingreso" : "Gasto"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para cambiar de archivo */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer underline"
                >
                  Subir otro archivo o comprobante
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer de confirmación fijado en la base */}
        <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md p-4 border-t border-white/10 pb-safe flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all cursor-pointer border border-white/10 order-2 sm:order-1"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              onClick={handleExecuteImport}
              disabled={importing || selectedCount === 0}
              className="w-full sm:flex-1 h-14 text-base font-bold rounded-2xl flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-black shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 order-1 sm:order-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Confirmar e Importar {selectedCount} Movimientos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
