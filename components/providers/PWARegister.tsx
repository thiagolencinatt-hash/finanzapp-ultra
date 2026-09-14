"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registrado con alcance:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Error al registrar Service Worker:", err);
        });
    }
  }, []);

  return null;
}
