# LARI Global Error Ledger (Bitácora Universal)

Aquí Lari documenta cada incidente crítico y la lección definitiva para la posteridad.

---
### ID: GEL-001 | Error de Sincronización en Next.js (App Router)
* **Fecha**: 2026-09-22
* **Síntomas**: Cambios hechos en la base de datos (Supabase) no se reflejaban al instante en otros dispositivos ni tras mutaciones.
* **Causa Raíz**: Caché agresivo de peticiones GET en Next.js App Router, agravado por persistencia desfasada en `localStorage` (fallback erróneo).
* **Solución**: Añadir `export const dynamic = "force-dynamic";` a todos los endpoints de API que leen datos vivos (GET). Eliminar la dependencia de UI sobre el almacenamiento en caché local temporal.
* **Regla Preventiva**: Todo endpoint de Next.js (`route.ts`) que sirva estado dinámico desde la nube DEBE declarar la directiva `force-dynamic` (sub-skill: `skill-supabase-resilience.md`).

---
### ID: GEL-002 | Safari Auto-Zoom en Inputs iOS
* **Fecha**: 2026-09-22
* **Síntomas**: La UI se rompía o hacía zoom forzado incontrolable en el iPhone al tocar un campo de texto o select.
* **Causa Raíz**: iOS Safari aplica auto-zoom incondicional si el tamaño de fuente (`font-size`) de un input es menor a 16px.
* **Solución**: Forzar `font-size: 16px !important;` en `@media (max-width: 639px)` para `input`, `select`, y `textarea` globales, o usar `text-base`.
* **Regla Preventiva**: Regla de fuego en desarrollo Frontend Móvil: NUNCA usar fuentes menores a 16px en elementos de formulario en Mobile (sub-skill: `skill-mobile-first.md`).

---
### ID: GEL-003 | Silent Failures en Resend / OTP
* **Fecha**: 2026-09-22
* **Síntomas**: El usuario no recibe el email OTP, pero la API responde HTTP 200 Success.
* **Causa Raíz**: `resend.emails.send` capturaba el error pero el sistema local lo tragaba (swallowed error) y continuaba el flujo.
* **Solución**: Añadir `throw new Error(...)` tras recibir error de la API de Resend y devolver HTTP 500 para que el Frontend detenga el flujo y alerte con un toast.
* **Regla Preventiva**: En servicios críticos de terceros (Auth, Mail, Pagos), NO usar silent fallbacks en caso de excepción, SIEMPRE lanzar el error para feedback visual temprano del cliente.
