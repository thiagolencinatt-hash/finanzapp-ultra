"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ViewMode = "mobile" | "desktop";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  isMobile: boolean;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: "mobile",
  setViewMode: () => {},
  toggleViewMode: () => {},
  isMobile: true,
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("mobile");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("finanzapp_view_mode") as ViewMode | null;
    if (saved === "mobile" || saved === "desktop") {
      setViewModeState(saved);
    } else {
      // Auto-detectar dispositivo
      const isSmallScreen = window.innerWidth < 768;
      setViewModeState(isSmallScreen ? "mobile" : "desktop");
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem("finanzapp_view_mode", mode);
      document.documentElement.setAttribute("data-view-mode", mode);
    } catch {}
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "mobile" ? "desktop" : "mobile");
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-view-mode", viewMode);
    }
  }, [viewMode, mounted]);

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        toggleViewMode,
        isMobile: viewMode === "mobile",
      }}
    >
      <div data-view-mode={viewMode} className="w-full min-h-screen">
        {children}
      </div>
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
