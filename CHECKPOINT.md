# Checkpoint - FinanzApp Ultra (GEL-047)

**Fecha:** 2026-10-05
**Estado:** Producción Lista (Build OK · 0 errores TypeScript · Commit be1f965)

## Logros GEL-047: Ciclo Laboral al 25, Horas Semanales, Descongestión UI & Cuotas/Radar
1. **Motor Laboral (Ciclo de Corte al 25):**
   - Implementado `getWorkCycleRange()` en `lib/utils/payroll-calculator.ts` con corte al día 25 por defecto (cómputo del día 26 al 25).
   - `SalaryCard.tsx` y `LaborAuditorCard.tsx` filtran y auditan horas estrictamente dentro del ciclo de corte activo.
   - Modal de ajuste de sueldo con soporte para **Horas Semanales** (ej. 44 hs x 4.333 para base mensual) y **Horas Mensuales fijas**.
2. **Fecha de Cobro Configurable & Banner Interactivo:**
   - `SmartRemindersBanner.tsx` interactivo con modal para configurar regla de cobro: 5to día hábil legal, día fijo del mes (ej. día 10), o N-ésimo día hábil.
   - Sincronizado en tiempo real con la cuenta regresiva de cobro mediante evento global.
3. **Ergonomía Móvil y Descongestión UI:**
   - Padding inferior extendido a `pb-44` en todas las vistas de dashboard (espacio garantizado sobre el Floating Dock).
   - Ritmo visual ampliado a `space-y-5 sm:space-y-6`.
   - Modales adaptados a `max-h-[85dvh] flex flex-col`, scroll body con `overflow-y-auto overscroll-contain pb-12 pr-1`, y botonera fija inferior `sticky bottom-0 bg-neutral-900/95 backdrop-blur-md pt-3 pb-3 border-t border-white/10`.
4. **Radar de Suscripciones Interactivo (CRUD):**
   - `SubscriptionRadarCard.tsx` con modal para editar monto, día de débito, nombre y notas, o eliminar suscripciones.
   - Botón "+ Agregar Suscripción / Gasto Fijo" y persistencia en `/api/subscriptions` (GET, POST, PUT, DELETE).
5. **Módulo Dedicado de Cuotas & Metas:**
   - Descongestionada la pestaña Finanzas; reemplazados bloques densos por tarjeta de acceso dedicada: "💳 Mis Cuotas & Metas Financieras".
   - `InstallmentsGoalsModal.tsx` con registro directo de compras en cuotas (monto por cuota auto-calculado) y botón interactivo "Marcar cuota como pagada".
6. **Reconciliación Mercado Pago:**
   - Anclaje auditado a saldo final oficial sin distorsión por deltas históricos.
