"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Maximize2 } from "lucide-react";

// Sistema global de z-index para apilar ventanas correctamente
let zCounter = 60;
const getNextZ = () => ++zCounter;

interface DraggableWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  windowId: string;
  defaultPosition?: { x: number; y: number };
  footer?: ReactNode; // Botones de acción en el pie (Guardar/Cancelar)
}

export function DraggableWindow({
  isOpen,
  onClose,
  title,
  children,
  windowId,
  defaultPosition = { x: 0, y: 0 },
  footer,
}: DraggableWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [zIndex, setZIndex] = useState(60);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Al hacer click en la ventana, la trae al frente
  const bringToFront = useCallback(() => {
    setZIndex(getNextZ());
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={windowId}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none sm:p-4"
          style={{ zIndex }}
          onPointerDown={bringToFront}
        >
          {/* Overlay solo en mobile */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto sm:hidden"
            onClick={onClose}
          />

          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{ left: -600, right: 600, top: -400, bottom: 400 }}
            className={`pointer-events-auto relative flex flex-col glass-strong shadow-2xl border border-white/10 transition-all duration-200
              ${isMinimized
                ? "w-[320px] h-[52px] rounded-2xl"
                : "w-full h-full sm:w-[520px] sm:h-auto sm:max-h-[88vh] sm:rounded-2xl"
              }`}
            style={{ x: defaultPosition.x, y: defaultPosition.y }}
          >
            {/* Header / Barra de título arrastrable */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b cursor-grab active:cursor-grabbing shrink-0 select-none"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}
            >
              <div className="flex items-center gap-2.5">
                {/* Semáforo macOS */}
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group transition-colors"
                    title="Cerrar"
                  >
                    <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                    className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center group transition-colors"
                    title={isMinimized ? "Expandir" : "Minimizar"}
                  >
                    <Minus className="w-2 h-2 text-yellow-900 opacity-0 group-hover:opacity-100" />
                  </button>
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-60" />
                </div>
                <h3 className="ml-1 font-semibold text-xs text-foreground/90 truncate max-w-[200px]">
                  {title}
                </h3>
              </div>

              {/* Botones rápidos visibles siempre (útil cuando minimizado) */}
              <div className="flex items-center gap-1">
                {isMinimized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors cursor-pointer"
                    title="Expandir"
                  >
                    <Maximize2 className="w-2.5 h-2.5" /> Abrir
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contenido (Scrollable) — solo cuando no minimizado */}
            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {children}
              </div>
            )}

            {/* Pie de ventana con botones de Guardar/Cerrar si existen */}
            {!isMinimized && footer && (
              <div
                className="px-5 py-3 border-t flex items-center justify-end gap-2 shrink-0"
                style={{ borderColor: "hsl(var(--border) / 0.5)" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
