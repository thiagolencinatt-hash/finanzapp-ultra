"use client";

import { useEffect, useState } from "react";
import { CloudOff, Info } from "lucide-react";

export function HealthBadge() {
  const [isHealthy, setIsHealthy] = useState(true);
  const [errorDetails, setErrorDetails] = useState("");
  const [showModal, setShowModal] = useState(false);

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
              La aplicación está funcionando en <strong>Modo Local-First</strong> porque hay un problema de conexión con Supabase en Vercel. 
              Tus transacciones se guardarán en tu dispositivo y no perderás ningún dato.
            </p>
            <pre className="text-xs bg-black p-3 rounded-lg text-red-400 whitespace-pre-wrap font-mono mb-6 border border-zinc-800">
              {errorDetails}
            </pre>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
