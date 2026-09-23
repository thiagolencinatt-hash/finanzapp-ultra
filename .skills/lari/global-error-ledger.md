# LARI Global Error Ledger (Bit√°cora Universal)

Aqu√≠ Lari documenta cada incidente cr√≠tico y la lecci√≥n definitiva para la posteridad.

---
### ID: GEL-001 | Error de Sincronizaci√≥n en Next.js (App Router)
* **Fecha**: 2026-09-22
* **S√≠ntomas**: Cambios hechos en la base de datos (Supabase) no se reflejaban al instante en otros dispositivos ni tras mutaciones.
* **Causa Ra√≠z**: Cach√© agresivo de peticiones GET en Next.js App Router, agravado por persistencia desfasada en `localStorage` (fallback err√≥neo).
* **Soluci√≥n**: A√±adir `export const dynamic = "force-dynamic";` a todos los endpoints de API que leen datos vivos (GET). Eliminar la dependencia de UI sobre el almacenamiento en cach√© local temporal.
* **Regla Preventiva**: Todo endpoint de Next.js (`route.ts`) que sirva estado din√°mico desde la nube DEBE declarar la directiva `force-dynamic` (sub-skill: `skill-supabase-resilience.md`).

---
### ID: GEL-002 | Safari Auto-Zoom en Inputs iOS
* **Fecha**: 2026-09-22
* **S√≠ntomas**: La UI se romp√≠a o hac√≠a zoom forzado incontrolable en el iPhone al tocar un campo de texto o select.
* **Causa Ra√≠z**: iOS Safari aplica auto-zoom incondicional si el tama√±o de fuente (`font-size`) de un input es menor a 16px.
* **Soluci√≥n**: Forzar `font-size: 16px !important;` en `@media (max-width: 639px)` para `input`, `select`, y `textarea` globales, o usar `text-base`.
* **Regla Preventiva**: Regla de fuego en desarrollo Frontend M√≥vil: NUNCA usar fuentes menores a 16px en elementos de formulario en Mobile (sub-skill: `skill-mobile-first.md`).

---
### ID: GEL-003 | Silent Failures en Resend / OTP
* **Fecha**: 2026-09-22
* **S√≠ntomas**: El usuario no recibe el email OTP, pero la API responde HTTP 200 Success.
* **Causa Ra√≠z**: `resend.emails.send` capturaba el error pero el sistema local lo tragaba (swallowed error) y continuaba el flujo.
* **Soluci√≥n**: A√±adir `throw new Error(...)` tras recibir error de la API de Resend y devolver HTTP 500 para que el Frontend detenga el flujo y alerte con un toast.
* **Regla Preventiva**: En servicios cr√≠ticos de terceros (Auth, Mail, Pagos), NO usar silent fallbacks en caso de excepci√≥n, SIEMPRE lanzar el error para feedback visual temprano del cliente.

---
### ID: GEL-004 | Bug de AgregaciÛn de Saldos y UI Mobile
* **Fecha**: 2026-09-22
* **SÌntomas**: Transacciones sobreescribÌan el saldo en vez de sumar (ej. 300+500 != 800), y la UI mÛvil bloqueaba ·reas t·ctiles con el bottom nav.
* **Causa RaÌz**: CachÈ agresivo de peticiones GET de Next.js (browser side cache) impedÌa la rehidrataciÛn en las llamadas API (/api/summary) post-evento. En UI, no habÌa pb-28 al final de p·gina y botones < 44px.
* **SoluciÛn**: Se inyectÛ { cache: 'no-store' } explÌcito a los fetches del dashboard, se agregÛ pb-28 md:pb-12 y min-h-[44px] a elementos de form.
* **Regla Preventiva**: Todo fetch en Client Components en Next 13+ a una API que deba reflejar un saldo tras un cambio requiere strict cache-busting o 'no-store'.
