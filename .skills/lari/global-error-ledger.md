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

---
### ID: GEL-011 | Inmunidad AI Local-First y Esquema Auto-Hosteado
* **Fecha**: 2026-09-22
* **Síntomas**: AI Assistant sobrescribía los saldos locales con 0 al fallar el guardado porque no existían las tablas de Supabase en el nuevo proyecto. Se producía pérdida total de datos.
* **Causa Raíz**: 1. `/api/summary` devolvía un estado inicial (0) al fallar y el cliente reemplazaba su caché válido. 2. `addTransaction` de la IA devolvía un string de error y bloqueaba el pipeline, perdiendo la transacción.
* **Solución**: 1. `page.tsx` ahora bloquea sobrescrituras de `setSummary(0)` si `resSummary.ok` es false o los datos son inválidos, leyendo del caché `finanzapp_last_summary`. 2. El asistente IA intercepta errores de Base de Datos y devuelve la transacción creada al frontend para que este la guarde localmente en `local_transactions` de forma optimista. 3. Se proveyó un script `scripts/init-schema.sql` y `/api/setup-db` para resolver el Missing Table Error en un click.
* **Regla Preventiva**: El cliente siempre debe ganar (Client Wins) cuando los servicios en la nube devuelven errores 500, timeouts o estructuras vacías no deseadas. La inteligencia artificial debe integrarse a la canalización Optimistic-UI y no depender de DB callbacks.

---
### ID: GEL-012 | SyncEngine: Reconciliación y Sincronización Realtime Multi-Dispositivo
* **Fecha**: 2026-09-22
* **Síntomas**: Las transacciones hechas offline quedaban atrapadas en el dispositivo si se cerraba la ventana, y la sesión en la PC no reflejaba los gastos agregados desde el celular al instante.
* **Causa Raíz**: Falta de un motor de sincronización background (Offline-to-Online) y ausencia de suscripciones WebSocket activas para invalidar el caché visual en eventos externos.
* **Solución**: 1. Se creó `SyncEngine.tsx` (reemplazando `HealthBadge`). Al detectar conectividad exitosa, escanea silenciosamente el `localStorage`, empuja las transacciones con `synced: false` y las marca como true. 2. Inicializa `supabase.channel` suscribiéndose a eventos `INSERT/UPDATE/DELETE` de PostgreSQL en tiempo real; al detectar cambios remotos, despacha el evento global `finance-refresh` forzando a la UI a hidratarse. Muestra toast verde "Nube Sincronizada" si hubo reconciliación.
* **Regla Preventiva**: La persistencia local no sirve sin un Reconciliador activo. Siempre que se adopte Local-First, debe emparejarse con un SyncEngine global que corra en Layout para vaciar la cola offline al recuperar conexión.

---
### ID: GEL-013 | Auto-Seed Resiliente y Anti-Zero Balance en IA
* **Fecha**: 2026-09-22
* **Síntomas**: Al solicitar a la IA registrar un gasto en un proyecto de Supabase recién instanciado, el asistente fallaba por falta de `account_id` (0 cuentas). Tras la recarga, `/api/summary` devolvía un balance falso de $0 y sobreescribía la UI.
* **Causa Raíz**: 1. Supabase permite `accounts` vacío para nuevos usuarios. 2. `addTransaction` intentaba insertar sin una Foreign Key válida. 3. `getSummary` sumaba solo `accounts.balance` ignorando `transactions` cuando `accounts` estaba vacío.
* **Solución**: 1. Se implementó `ensureDefaultAccount(userId)` en `supabase-store.ts` que inyecta automáticamente una cuenta "Efectivo" si el usuario no tiene ninguna. 2. `addTransaction` ahora usa `ensureDefaultAccount` y actualiza atómicamente `accounts.balance` (+ o - amount) en PostgreSQL. 3. `getSummary` recalculando el `total_balance` leyendo y sumando directo desde `transactions` si detecta que `accounts.balance` es 0 pero existen movimientos, eliminando por completo el "Flicker de Balance en Cero".
* **Regla Preventiva**: Nunca confiar ciegamente en tablas padre (como `accounts`) para calcular resúmenes si pueden estar desfasadas o no sembradas. Siempre proveer fallbacks matemáticos basados en tablas hijo inmutables (`transactions`) y garantizar Auto-Seed en flujos críticos.
## GEL-014: Historial de transacciones vaco y reset al exportar (Resuelto)
**Sntomas:** Al exportar a Excel, la UI se reiniciaba. El historial no mostraba transacciones creadas por la IA.
**Causa:** Los botones de exportacin no tenan \	ype=\
button\\, causando submit de formularios o refresh de pgina. \/api/ai-assistant\ no inclua \user_id\ ni \created_at\ en el payload optimista. \	ransactions/page.tsx\ no escuchaba \inance-refresh\ ni mergeaba \local_transactions\.
**Solucin:** Se agreg \	ype=\
button\\ a los botones. Se actualiz el payload de la IA. Se aadi un listener de \inance-refresh\ y se unific la lectura de \local_transactions\ en la vista del historial.

---
### ID: GEL-015 | Implementación Completa de Cuentas (CRUD) y Transferencias (Misión LARI 11)
* **Fecha**: 2026-09-23
* **Síntomas**: La aplicación permitía registrar transferencias pero solo descontaba el saldo origen, perdiendo dinero en el limbo (fuga de fondos). Faltaba interfaz dedicada para administrar cuentas.
* **Causa Raíz**: Lógica de `addTransaction` incompleta (no detectaba ni impactaba `destination_account_id`).
* **Solución**: 
  1. Se actualizó `supabase-store.ts` para que ante un `type === 'transfer'`, sume el dinero en la `destination_account_id`.
  2. Se creó `/accounts` con arquitectura Local-First (Grid UI ultra-dark).
  3. Todos los botones de acciones usan explícitamente `type="button"` previniendo reseteos.
  4. Sincronización transparente con `window.dispatchEvent(new Event('finance-refresh'))`.
* **Regla Preventiva**: Toda transferencia entre cuentas (`transfer`) debe considerarse atómica y bifurcada. Nunca restar de la cuenta origen sin asegurar la suma paralela en la cuenta destino.
