# Lari Sub-Skill: Mobile First & iOS Safari

## Principios Inquebrantables

### 1. Viewport y Safe Areas
* NUNCA usar `100vh` crudo. Utilizar `min-h-dvh` o `height: 100dvh` para evitar saltos bruscos cuando aparece/desaparece la barra de navegación en iOS/Android.
* Aplicar padding seguro en componentes flotantes o footers usando CSS `padding-bottom: env(safe-area-inset-bottom);` (clase `.pb-safe` en Tailwind).
* Bloquear el scroll horizontal indeseado con `overflow-x-hidden` global en `body`.

### 2. Prevención del Auto-Zoom (iOS Safari)
* Para evitar que la interfaz haga zoom automáticamente y arruine la experiencia al enfocar inputs:
  * NUNCA utilices un tamaño de fuente menor a `16px` (`text-base` en Tailwind) para `<input>`, `<select>` o `<textarea>`.
  * Si requieres visualmente que parezcan más pequeños, hazlo en Desktop (`text-base md:text-sm`).

### 3. Hit Targets Táctiles
* Cualquier botón o enlace en móvil debe tener un área clickeable mínima absoluta de `44x44px` (Apple HIG) o `48x48px` (Material Design). Usa `p-3` o tamaños `w-11 h-11`.

### 4. Gestos y Touch Action
* Desactiva el doble toque para zoom en botones para permitir clics rápidos sin delay: `touch-action: manipulation;`.
* Oculta el sombreado azul nativo en móviles con `-webkit-tap-highlight-color: transparent;`.
