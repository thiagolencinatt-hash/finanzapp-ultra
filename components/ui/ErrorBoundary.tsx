"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary genérico para capturar errores de renderizado en React.
 * Evita que un crash en un componente hijo desmonte todo el árbol de la app.
 * GEL-021: Blindaje contra colapso del dashboard al registrar transacciones.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl p-6 text-center border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-400">
              {this.props.fallbackTitle || "Algo salió mal"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mb-4 max-w-xs mx-auto">
            {this.props.fallbackMessage ||
              "Se produjo un error al renderizar esta sección. Tus datos están seguros."}
          </p>
          {this.state.error && (
            <pre className="text-[10px] text-red-400/70 bg-black/30 rounded-lg p-2 mb-3 max-h-20 overflow-auto font-mono">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
