# Lari Sub-Skill: Gemini Multimodal & AI Protocols

## Principios Inquebrantables

### 1. Robustez en Prompts de Extracción de Datos
* Cuando uses GenAI (Gemini) para extraer datos de imágenes (ej. comprobantes OCR):
  * Obliga SIEMPRE la salida estructurada usando `response_mime_type: "application/json"`.
  * Nunca asumas que el modelo inferirá correctamente el formato numérico. Especifica en el prompt: "Elimina signos monetarios, elimina puntos de separador de miles, usa el punto (.) estrictamente como separador de decimales".

### 2. Timeouts y Fallbacks
* Las llamadas a modelos de IA grandes son propensas a cold-starts y alta latencia.
* Envuelve cada invocación en un Promise.race para imponer un timeout estricto (ej. 15s).
* SIEMPRE incluye un bloque `catch` para manejar la degradación elegante: informa al usuario "El servicio de IA tardó demasiado. Por favor intenta cargar el gasto manualmente".

### 3. Cascadas de Modelos
* Si el modelo multimodal de vanguardia (ej. gemini-1.5-pro) devuelve un error de deprecated o quota limits, ten un fallback preparado hacia un modelo más ligero (ej. gemini-1.5-flash) en el bloque `catch`.
