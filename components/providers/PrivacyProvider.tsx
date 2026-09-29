"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils/currency";

interface PrivacyContextType {
  isPrivate: boolean;
  togglePrivacy: () => void;
  setPrivacy: (val: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivate: false,
  togglePrivacy: () => {},
  setPrivacy: () => {},
});

const STORAGE_KEY = "finanzapp_privacy_mode";

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivateState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setIsPrivateState(true);
      }
    } catch {
      // ignore
    }

    // Keyboard shortcut: Press 'P' to toggle privacy mode
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsPrivateState((prev) => {
          const next = !prev;
          localStorage.setItem(STORAGE_KEY, String(next));
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePrivacy = useCallback(() => {
    setIsPrivateState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const setPrivacy = useCallback((val: boolean) => {
    setIsPrivateState(val);
    localStorage.setItem(STORAGE_KEY, String(val));
  }, []);

  return (
    <PrivacyContext.Provider
      value={{
        isPrivate: mounted ? isPrivate : false,
        togglePrivacy,
        setPrivacy,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function PrivacyAmount({
  value,
  currency = "ARS",
  showDecimals = true,
  className = "",
}: {
  value: number;
  currency?: string;
  showDecimals?: boolean;
  className?: string;
}) {
  const { isPrivate } = usePrivacy();

  if (isPrivate) {
    return <span className={`font-mono tracking-widest select-none ${className}`}>$ ••••••</span>;
  }

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {formatCurrency(value, currency, showDecimals)}
    </span>
  );
}
