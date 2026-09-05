# 💎 FinanzApp Ultra — Finanzas Personales & Control Pro

> Plataforma minimalista, moderna y profesional de finanzas personales, inspirada en los mejores referentes fintech mundiales (**Copilot Money, Monarch, Apple Wallet**). Diseñada para darte claridad total sobre tu dinero en cualquier dispositivo (iPhone, Android, tablet o PC) con soporte PWA nativo y despliegue en 1 clic.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fthiagolencinatt-hash%2Ffinanzapp-ultra)
![Next.js 16](https://img.shields.io/badge/Next.js-16.3.3-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-10b981?logo=pwa)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 📱 ¿Cómo usarla en cualquier dispositivo?

### Opción 1: Despliegue en 1 Clic en Vercel (Gratis y Permanente)
1. Haz clic en el botón de arriba **"Deploy with Vercel"** o entra a [vercel.com/new](https://vercel.com/new) e importa este repositorio (`thiagolencinatt-hash/finanzapp-ultra`).
2. Haz clic en **Deploy**. En 60 segundos tendrás tu propia URL pública (ejemplo: `https://tu-finanzapp.vercel.app`).
3. Abre esa URL en tu celular o computadora ¡y listo!

### Opción 2: Instalar como App Nativa (PWA en Celulares)
- **En iPhone (iOS Safari):**
  1. Abre tu URL en Safari.
  2. Toca el botón **Compartir** (icono de cuadro con flecha hacia arriba).
  3. Selecciona **"Agregar a pantalla de inicio"** (Add to Home Screen).
  4. Se instalará con su icono exclusivo, pantalla completa sin barras del navegador y rendimiento fluido a 120Hz.
- **En Android (Google Chrome):**
  1. Abre tu URL en Chrome.
  2. Toca el menú de tres puntos (arriba a la derecha).
  3. Selecciona **"Instalar aplicación"** o **"Agregar a pantalla principal"**.

---

## ✨ Nuevas Funcionalidades Pro

### 1. 🛡️ Indicador de Salud Financiera Pro (Score 0 a 100)
- **Puntuación en tiempo real:** Evaluación automática de la estabilidad de tus finanzas.
- **Tasa de Ahorro Real (%):** Porcentaje del sueldo destinado a ahorro e inversión.
- **Runway (Colchón de Emergencia):** Meses de supervivencia cubiertos con tu saldo disponible.
- **Flujo de Caja Libre:** Dinero neto que te queda tras cubrir gastos fijos, cuotas de tarjetas y metas.
- **Ratio de Endeudamiento:** Porcentaje del ingreso comprometido en cuotas mensuales.

### 2. 📊 Presupuestos Mensuales Inteligentes (Category Budgets)
- Define topes máximos de gasto por rubro (Supermercado, Salidas, Servicios, etc.).
- Barras de progreso dinámicas con semáforo visual:
  - **Verde (< 80%):** En presupuesto saludable.
  - **Ámbar (80% - 100%):** Alerta de gasto cercano al límite.
  - **Rojo (> 100%):** Alerta de sobregasto con monto excedido exacto.
- Indicador instantáneo de **"Restante disponible este mes"**.

### 3. 🔁 Control de Suscripciones y Gastos Fijos
- Administra tus pagos periódicos (Netflix, Spotify, Gimnasio, Alquiler, Internet, Cloud).
- Contador inteligente: **"Vence en X días"** o alerta si vence hoy.
- Switch de activación/pausa para auditar y recortar gastos vampiro.
- Proyección consolidada del gasto mensual y costo anualizado.

### 4. ⚡ Registro Rápido con Botón Flotante Central
- Botón táctil elevado en la barra inferior para registrar un gasto o ingreso en **3 segundos** desde el celular.
- Pantalla táctil con selector rápido de categoría y cuenta.

### 5. 💾 Copia de Seguridad & Restauración Universal (JSON)
- **Exportación en 1 clic:** Descarga todos tus presupuestos, suscripciones, movimientos, metas y cuentas en un archivo JSON seguro.
- **Importación instantánea:** Sube tu archivo JSON en cualquier celular o computadora y tus datos se restaurarán automáticamente.

### 6. 💵 Cotizaciones del Dólar en Vivo (Argentina)
- Cotizaciones actualizadas de Dólar Blue, MEP, Oficial y Tarjeta en tiempo real con cálculo automático de conversiones.

### 7. 🎯 Metas & Wishlist con Asignador de Sueldo
- Divide tu sueldo con porcentajes rápidos (10%, 20%, 30%) hacia tus metas de ahorro prioritarias.
- Proyección de tiempo estimado para cumplir cada meta.

### 8. 💳 Cuotas y Deudas
- Gestión completa de compras en cuotas con y sin interés.
- Botón para marcar cuotas como pagas con actualización de saldos.
- Proyección de compromisos en los próximos meses.

---

## 🛠️ Tecnologías Utilizadas

- **Core:** Next.js 16 (App Router + Turbopack) & React 19
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS v4 con paleta personalizada "Nano Banana" minimalista
- **Animaciones:** Framer Motion
- **Gráficos:** Recharts
- **Iconografía:** Lucide React
- **PWA:** Manifest v3, Apple Web App Meta, Safe Area Insets (`dvh` & `env(safe-area-inset-*)`)
- **Backend / Persistencia:** API Routes integradas en Next.js con soporte para almacenamiento local offline y Supabase.

---

## 🚀 Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/thiagolencinatt-hash/finanzapp-ultra.git
cd finanzapp-ultra

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:3000
```

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
