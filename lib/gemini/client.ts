import { GoogleGenAI } from "@google/genai";

export function getGenAI(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini")) {
    throw new Error("GEMINI_API_KEY no configurada");
  }
  return new GoogleGenAI({ apiKey });
}

// Modelos soportados con orden de prioridad (evita caídas si Google tiene picos de demanda 503)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const GEMINI_FALLBACK_MODELS = [GEMINI_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"];

