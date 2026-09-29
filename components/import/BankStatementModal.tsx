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
        throw new Error(data.error || "No se pudo procesar el archivo.");
      }

      if (!data.transactions || data.transactions.length === 0) {
        setError("No se encontraron transacciones legibles en el archivo.");
        setParsedData(null);
        return;
      }

      setParsedData({
        detectedBank: data.detectedBank || "Extracto Bancario",
        transactions: data.transactions,
        totalIncome: data.totalIncome || 0,
        totalExpense: data.totalExpense || 0,
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
      console.warn("API import fallback check:", err);
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
            });
            toast.success(`¡Detectado ${localResult.detectedBank}! Se encontraron ${localResult.transactions.length} movimientos.`);
            return;
          }
        } catch {
          // ignore
        }
      }
      setError(err.message || "Error al procesar el archivo.");
      setParsedData(null);
    } finally {
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
        body: JSON.stringify({ transactions: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al importar movimientos");
      }

      toast.success(`🎉 ${toImport.length} movimientos importados exitosamente.`);
      window.dispatchEvent(new Event("finance-refresh"));
      onSuccess?.();
      onClose();
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
      <div 
        className="w-full max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-zinc-950 border-t border-x sm:border border-white/[0.1] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Handle pill para móvil */}
        <div className="w-12 h-1.5 bg-neutral-600 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.08] bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                {initialBank ? `Importar Extracto / Comprobante de ${initialBank}` : "Importar Extracto o Comprobante"}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PDF • IA • Excel
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Soporta PDF de Mercado Pago, capturas de pantalla, fotos y archivos Excel / CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!parsedData ? (
            /* Upload State */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.12] hover:border-emerald-500/40 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer bg-white/[0.01] hover:bg-emerald-500/[0.02] group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] group-hover:bg-emerald-500/10 text-zinc-400 group-hover:text-emerald-400 flex items-center justify-center transition-all border border-white/[0.05] group-hover:border-emerald-500/20">
                  {parsing ? (
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-bold text-zinc-200">
                    {parsing ? "Analizando comprobantes o extracto con IA..." : "Arrastrá tu PDF, captura o extracto aquí o hacé clic"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Formatos soportados: <span className="text-emerald-400 font-semibold">PDF de Mercado Pago</span>, <span className="text-zinc-300 font-semibold">Capturas / Fotos, Excel y CSV</span>
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

              {/* Supported Banks Badges */}
              <div className="rounded-2xl p-4 bg-zinc-900/40 border border-white/[0.06] space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Bancos y plataformas auto-detectadas
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Mercado Pago", "Banco Santander", "Banco Galicia", "BBVA", "Brubank", "Lemon Cash", "Ualá", "Extractos Genéricos"].map((bank) => (
                    <span
                      key={bank}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.03] text-zinc-300 border border-white/[0.06] text-[11px] font-medium"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* Preview & Confirm State */
            <div className="space-y-4">
              {/* Info Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Origen detectado</p>
                    <p className="text-sm font-extrabold text-zinc-200">{parsedData.detectedBank}</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Ingresos detectados</p>
                    <p className="text-sm font-extrabold text-emerald-400 font-mono">
                      {formatCurrency(parsedData.totalIncome, "ARS", true)}
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Gastos detectados</p>
                    <p className="text-sm font-extrabold text-rose-400 font-mono">
                      {formatCurrency(parsedData.totalExpense, "ARS", true)}
                    </p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
              </div>

              {/* Account Selector */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-300">Asignar a cuenta de destino:</span>
                </div>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/[0.1] text-xs font-semibold text-zinc-200 outline-none focus:border-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action row with select all */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="hover:text-emerald-400 underline font-medium cursor-pointer"
                  >
                    Seleccionar todos
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="hover:text-rose-400 underline font-medium cursor-pointer"
                  >
                    Deseleccionar todos
                  </button>
                </div>
                <div className="font-semibold text-zinc-300">
                  {selectedCount} de {parsedData.transactions.length} seleccionados
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-zinc-900 border-b border-white/[0.08] text-zinc-400">
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Detalle / Comercio</th>
                      <th className="p-3 hidden sm:table-cell">Categoría</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {parsedData.transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => toggleRow(tx.id)}
                        className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                          !tx.selected ? "opacity-40" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={tx.selected}
                            onChange={() => toggleRow(tx.id)}
                            className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-3 text-zinc-400 whitespace-nowrap font-mono">{tx.date}</td>
                        <td className="p-3 text-zinc-200 font-medium max-w-[200px] truncate">
                          {tx.description}
                        </td>
                        <td className="p-3 hidden sm:table-cell text-zinc-400">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-zinc-300">
                            {tx.suggestedCategory}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold font-mono whitespace-nowrap">
                          <span className={tx.type === "income" ? "text-emerald-400" : "text-rose-400"}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, "ARS", true)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón para cambiar de archivo */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer underline"
                >
                  Subir otro archivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 pb-safe border-t border-white/[0.08] bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] h-12 px-6 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-all cursor-pointer border border-white/5 order-2 sm:order-1"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              onClick={handleExecuteImport}
              disabled={importing || selectedCount === 0}
              className="w-full sm:w-auto min-h-[48px] h-12 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-[0.98] order-1 sm:order-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Importar {selectedCount} movimientos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
