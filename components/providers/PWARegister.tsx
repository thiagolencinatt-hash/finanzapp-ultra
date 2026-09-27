"use client";

import { useEffect } from "react";

/**
 * PWARegister — Desactiva y purga proactivamente cualquier Service Worker
 * y caché previo para evitar que móviles o navegadores sirvan respuestas viejas
 * o intercepten llamadas a /api/*.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => {
            console.log("[PWA] Service Worker desregistrado para garantizar sincronización en tiempo real.");
          });
        }
      });

      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }
  }, []);

  return null;
}
