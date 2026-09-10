"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Maximize2 } from "lucide-react";

// Sistema global de z-index para apilar ventanas siempre en primer plano absoluto
let zCounter = 99990;
const getNextZ = () => ++zCounter;

interface DraggableWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  windowId: string;
  defaultPosition?: { x: number; y: number };
  footer?: ReactNode; // Botones de acción en el pie (Guardar/Cancelar)
  className?: string; // Clase personalizada para tamaño/alto
}

export function DraggableWindow({
  isOpen,
  onClose,
  title,
  children,
  windowId,
  defaultPosition = { x: 0, y: 0 },
  footer,
  className = "w-full sm:w-[540px] max-h-[88vh]",
}: DraggableWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [zIndex, setZIndex] = useState(99990);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Al hacer click en la ventana, la trae al frente
  const bringToFront = useCallback(() => {
    setZIndex(getNextZ());
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={windowId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
          style={{ zIndex }}
          onPointerDown={bringToFront}
        >
          {/* Overlay global para bloquear interacciones del fondo y hacerlo borroso */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            drag={!isMobile}
            dragMomentum={false}
            dragElastic={0.06}
            dragConstraints={{ left: -500, right: 500, top: -350, bottom: 350 }}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            className={`relative flex flex-col glass-strong shadow-2xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 z-10 w-[calc(100vw-1.25rem)] max-w-full sm:max-w-none ${
              isMinimized ? "w-[300px] h-[52px]" : className
            }`}
            style={{ x: isMobile ? 0 : defaultPosition.x, y: isMobile ? 0 : defaultPosition.y }}
          >
            {/* Header / Barra de título arrastrable */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing shrink-0 select-none bg-black/20"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}
            >
              <div className="flex items-center gap-2.5">
                {/* Semáforo macOS */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center group transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                    className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center group transition-colors cursor-pointer"
                    title={isMinimized ? "Expandir" : "Minimizar"}
                  >
                    <Minus className="w-2 h-2 text-yellow-900 opacity-0 group-hover:opacity-100" />
                  </button>
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-60" />
                </div>
                <div className="ml-1 font-semibold text-xs text-foreground/90 truncate max-w-[300px] flex items-center gap-1.5">
                  {title}
                </div>
              </div>

              {/* Botones rápidos visibles siempre */}
              <div className="flex items-center gap-1">
                {isMinimized && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors cursor-pointer"
                    title="Expandir"
                  >
                    <Maximize2 className="w-2.5 h-2.5" /> Abrir
                  </button>
                )}
                <button
                  type="button"
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
              <div className="flex-1 overflow-y-auto min-h-0 p-5 custom-scrollbar">
                {children}
              </div>
            )}

            {/* Pie de ventana con botones de Guardar/Cerrar si existen */}
            {!isMinimized && footer && (
              <div
                className="px-5 py-3.5 border-t flex items-center justify-end gap-2 shrink-0 bg-card/90 backdrop-blur-md"
                style={{ borderColor: "hsl(var(--border) / 0.5)" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
