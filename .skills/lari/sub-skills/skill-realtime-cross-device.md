---
name: "Sincronización Cross-Device"
description: "Estrategias de estado y websockets para PWA multi-dispositivo en tiempo real"
---

# LARI Sub-Skill: Realtime Cross-Device Sync

## Objetivo
Garantizar que si el usuario registra una transacción en el teléfono (Safari iOS), su computadora de escritorio refleje el nuevo saldo instantáneamente sin recargar la página.

## Reglas de Implementación

### 1. Escuchas de Visibilidad Globales
En aplicaciones Single Page (PWA) o Next.js App Router, un componente global (`RealtimeSync`) debe inyectarse en el RootLayout para disparar un evento de actualización del sistema (ej. `finance-refresh`) ante:
- `visibilitychange` (cuando la pestaña vuelve a ser visible).
- `focus` (cuando el usuario tapea la PWA en el celular).

### 2. Sockets y Canales (Supabase Realtime)
No depender exclusivamente de "focos" de ventana. Los cambios de fondo (un cron, un familiar con cuenta compartida, otra sesión activa) deben impactar inmediatamente:
- Crear una suscripción `supabase.channel("schema-db-changes")`.
- Escuchar eventos `postgres_changes` de las tablas transaccionales.
- Filtrar la suscripción mediante `user_id=eq.${user.id}` para proteger la privacidad y mitigar sobrecarga de red.
- Despachar el evento global de actualización al recibir el socket.

### 3. Rehidratación Segura
Los componentes reactivos que escuchen este evento (`finance-refresh`) deben hacer un re-fetch directo a las APIs internas usando `{ cache: 'no-store' }`, forzando a Next.js a bypass del Data Cache y repintando la UI sin recargar todo el DOM.
