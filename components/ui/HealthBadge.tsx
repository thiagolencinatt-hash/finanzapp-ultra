"use client";

import { useEffect, useState } from "react";
import { CloudOff, Info } from "lucide-react";

export function HealthBadge() {
  const [isHealthy, setIsHealthy] = useState(true);
  const [errorDetails, setErrorDetails] = useState("");
  const [showModal, setShowModal] = useState(false);

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

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "degraded") {
          setIsHealthy(false);
          let details = "Faltan variables en el entorno:\n";
          if (!data.envCheck.NEXT_PUBLIC_SUPABASE_URL) details += "- NEXT_PUBLIC_SUPABASE_URL\n";
          if (!data.envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY) details += "- NEXT_PUBLIC_SUPABASE_ANON_KEY\n";
          if (!data.envCheck.SUPABASE_SERVICE_ROLE_KEY) details += "- SUPABASE_SERVICE_ROLE_KEY\n";
          if (!data.dbPing) details += `\nError de conexión a DB: ${data.error || "Desconocido"}`;
          setErrorDetails(details);
        }
      })
      .catch(() => {
        setIsHealthy(false);
        setErrorDetails("No se pudo contactar con /api/health");
      });
  }, []);

  if (isHealthy) return null;

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className="fixed bottom-4 right-4 z-50 bg-amber-500/20 border border-amber-500/50 text-amber-500 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 shadow-lg backdrop-blur-md animate-pulse hover:bg-amber-500/30 transition-colors"
      >
        <CloudOff className="w-4 h-4" />
        Modo Local Activo (Nube Desconectada)
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <Info className="w-6 h-6" />
              <h3 className="font-bold">Información de Nube</h3>
            </div>
            <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
              <strong>Modo Local Seguro:</strong> Tus datos están a salvo en este dispositivo. Para activar el respaldo en la nube, ejecuta el <a href="/api/setup-db" target="_blank" className="text-emerald-400 underline hover:text-emerald-300">script SQL en Supabase</a> o agrega las claves faltantes.
            </p>
            <pre className="text-xs bg-black p-3 rounded-lg text-red-400 whitespace-pre-wrap font-mono mb-6 border border-zinc-800 max-h-32 overflow-y-auto">
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
