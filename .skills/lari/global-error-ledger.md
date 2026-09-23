# LARI Global Error Ledger (BitÃ¡cora Universal)

AquÃ­ Lari documenta cada incidente crÃ­tico y la lecciÃ³n definitiva para la posteridad.

---
### ID: GEL-001 | Error de SincronizaciÃ³n en Next.js (App Router)
* **Fecha**: 2026-09-22
* **SÃ­ntomas**: Cambios hechos en la base de datos (Supabase) no se reflejaban al instante en otros dispositivos ni tras mutaciones.
* **Causa RaÃ­z**: CachÃ© agresivo de peticiones GET en Next.js App Router, agravado por persistencia desfasada en `localStorage` (fallback errÃ³neo).
* **SoluciÃ³n**: AÃ±adir `export const dynamic = "force-dynamic";` a todos los endpoints de API que leen datos vivos (GET). Eliminar la dependencia de UI sobre el almacenamiento en cachÃ© local temporal.
* **Regla Preventiva**: Todo endpoint de Next.js (`route.ts`) que sirva estado dinÃ¡mico desde la nube DEBE declarar la directiva `force-dynamic` (sub-skill: `skill-supabase-resilience.md`).

---
### ID: GEL-002 | Safari Auto-Zoom en Inputs iOS
* **Fecha**: 2026-09-22
* **SÃ­ntomas**: La UI se rompÃ­a o hacÃ­a zoom forzado incontrolable en el iPhone al tocar un campo de texto o select.
* **Causa RaÃ­z**: iOS Safari aplica auto-zoom incondicional si el tamaÃ±o de fuente (`font-size`) de un input es menor a 16px.
* **SoluciÃ³n**: Forzar `font-size: 16px !important;` en `@media (max-width: 639px)` para `input`, `select`, y `textarea` globales, o usar `text-base`.
* **Regla Preventiva**: Regla de fuego en desarrollo Frontend MÃ³vil: NUNCA usar fuentes menores a 16px en elementos de formulario en Mobile (sub-skill: `skill-mobile-first.md`).

---
### ID: GEL-003 | Silent Failures en Resend / OTP
* **Fecha**: 2026-09-22
* **SÃ­ntomas**: El usuario no recibe el email OTP, pero la API responde HTTP 200 Success.
* **Causa RaÃ­z**: `resend.emails.send` capturaba el error pero el sistema local lo tragaba (swallowed error) y continuaba el flujo.
* **SoluciÃ³n**: AÃ±adir `throw new Error(...)` tras recibir error de la API de Resend y devolver HTTP 500 para que el Frontend detenga el flujo y alerte con un toast.
* **Regla Preventiva**: En servicios crÃ­ticos de terceros (Auth, Mail, Pagos), NO usar silent fallbacks en caso de excepciÃ³n, SIEMPRE lanzar el error para feedback visual temprano del cliente.

---
### ID: GEL-004 | Bug de Agregación de Saldos y UI Mobile
* **Fecha**: 2026-09-22
* **Síntomas**: Transacciones sobreescribían el saldo en vez de sumar (ej. 300+500 != 800), y la UI móvil bloqueaba áreas táctiles con el bottom nav.
* **Causa Raíz**: Caché agresivo de peticiones GET de Next.js (browser side cache) impedía la rehidratación en las llamadas API (/api/summary) post-evento. En UI, no había pb-28 al final de página y botones < 44px.
* **Solución**: Se inyectó { cache: 'no-store' } explícito a los fetches del dashboard, se agregó pb-28 md:pb-12 y min-h-[44px] a elementos de form.
* **Regla Preventiva**: Todo fetch en Client Components en Next 13+ a una API que deba reflejar un saldo tras un cambio requiere strict cache-busting o 'no-store'.

---
### ID: GEL-005 | Borrado Accidental de Datos y Transparencia UI (Modal IA)
* **Fecha**: 2026-09-22
* **Síntomas**: Usuarios hacían click en 'Empezar de cero' por error al intentar exportar, el modal del IA Assistant permitía interactuar con el fondo por mala gestión del backdrop, y los saldos parpadeaban.
* **Causa Raíz**: Colocación riesgosa de botones de destrucción masiva junto a opciones comunes; falta de backdrop opaco bloqueante; coexistencia híbrida de localStore (fallback) para usuarios autenticados que enmascaraba datos de Supabase tras timeouts.
* **Solución**: Removido botón de reset de áreas comunes de navegación; modal IA 100% opaco y sin scroll document.body; eliminados los fallbacks a localStore si el usuario no es DEMO, forzando la consistencia transaccional (SSoT) en Supabase.
* **Regla Preventiva**: (1) JAMÁS ubicar acciones destructivas junto a acciones de lectura/exportación. (2) Si el usuario está autenticado en la nube, NO hacer fallback de lectura en localStore a menos que haya un modo offline explícito.

---
### ID: GEL-006 | Selectores de Cuenta Vacíos y Fallbacks Inseguros
* **Fecha**: 2026-09-22
* **Síntomas**: El formulario de nueva transacción permitía cuentas en blanco, bloqueando al usuario en una UI sin opciones si la DB no devolvía cuentas a tiempo.
* **Causa Raíz**: Falta de inicialización (auto-seed) en el backend y falta de option de fallback seguro en el `<select>` del frontend.
* **Solución**: Backend modificado para auto-inyectar Efectivo, Mercado Pago y Banco en el primer login. Frontend modificado con `<option>` de fallback condicional.
* **Regla Preventiva**: Todo sistema transaccional debe tener auto-seed garantizado para usuarios nuevos y fallback de recolección en el backend.

---
### ID: GEL-007 | Desfase Multi-Dispositivo (Sincronización Muerta)
* **Fecha**: 2026-09-22
* **Síntomas**: Al agregar un movimiento en PC, el iPhone abierto no lo mostraba hasta recargar manualmente toda la página.
* **Causa Raíz**: El cliente dependía exclusivamente de refetches atados a acciones locales, ignorando cambios externos en la base de datos.
* **Solución**: Se inyectó `<RealtimeSync />` global escuchando eventos `visibilitychange`, `focus` y `supabase.channel("schema-db-changes")`.
* **Regla Preventiva**: Las PWA financieras modernas no pueden ser reactivas pasivas. Deben estar conectadas por sockets/canales o invalidar caché al re-enfocar la pestaña.

---
### ID: GEL-008 | Balance Congelado y Falsa Ejecución IA (Turbo Execution)
* **Fecha**: 2026-09-22
* **Síntomas**: El balance no se actualizaba tras registrar un gasto; el bot de IA confirmaba registro pero no impactaba en la DB.
* **Causa Raíz**: Ausencia de invalidación del App Router (`router.refresh()`) post-mutación. El prompt del IA era laxo (temperature 0.6) y a veces respondía texto simulando ejecución sin llamar la tool.
* **Solución**: Inyección de `router.refresh()` y evento `finance-refresh` en todos los form-handlers. Ajuste de Gemini a `temperature: 0.2` con `REGLA ESTRICTA` de forzar `create_transaction`.
* **Regla Preventiva**: Toda acción mutativa del cliente debe ir sucedida de `router.refresh()` en App Router, y los agentes IA deben tener strict prompt constraints para ejecutar tools en lugar de alucinar acciones.

---
### ID: GEL-009 | Transacciones Fantasma y Caída Silenciosa (Supabase RLS & FK Constraints)
* **Fecha**: 2026-09-22
* **Síntomas**: Transacciones confirmadas como "exitosas" pero que nunca aparecían en el dashboard ni alteraban el balance.
* **Causa Raíz**: 1. `POST /api/transactions` asignaba strings como "default_cash" que violaban Foreign Keys en Supabase. 2. La API de Supabase devolvía un error de constraint o RLS, pero el backend lo capturaba (`catch`) silenciosamente y guardaba en `localStorage` (como fallback). 3. Luego `GET /api/transactions` *no leía* el fallback local si el usuario era uno real (solo lo hacía para "demo-user"), resultando en un abismo de datos.
* **Solución**: 1. Se creó `createAdminClient` para inyectar `SUPABASE_SERVICE_ROLE_KEY` o cookies validadas para bypass de permisos críticos. 2. Auto-creación forzosa de la cuenta "Efectivo" antes del insert si el usuario no tiene ninguna para prevenir violaciones de FK en `account_id`.
* **Regla Preventiva**: Nunca ocultar errores de base de datos con fallbacks a `localStorage` que luego son ignorados por el lector. Toda relación FK debe pre-garantizarse (creación perezosa) antes de la inserción principal.

---
### ID: GEL-010 | Zero-Data-Loss: Arquitectura Local-First y Diagnóstico
* **Fecha**: 2026-09-22
* **Síntomas**: Dependencia exclusiva de la nube. Si Supabase fallaba o faltaba una key de entorno, los datos de los usuarios se perdían en el aire, mostrando falsos mensajes de "Guardado exitoso" (engañando al usuario).
* **Causa Raíz**: Acoplamiento duro entre la base de datos central y la IU. Si la request HTTP a Supabase tardaba o fallaba, el estado de la UI o quedaba bloqueado, o continuaba asumiendo un éxito.
* **Solución**: Se integró patrón `Local-First / Optimistic UI`. Ahora al enviar una transacción, se guarda inmediatamente en `localStorage` (`synced: false`), se emite evento local y se re-hidrata `BalanceCard` en *cero milisegundos*. Luego se sincroniza en segundo plano sin bloquear. Si Supabase falla, la data persiste localmente y la UI informa el estado "Local". Se incorporó `/api/health` para diagnóstico de Vercel.
* **Regla Preventiva**: Nunca bloquear la UI en mutaciones simples esperando un backend remoto que puede fallar. Asumir Local-First siempre y sincronizar en background como "Enhancement".
