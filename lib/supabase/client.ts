import { createBrowserClient } from "@supabase/ssr";

// URLs y llaves seguras de fallback para evitar crashes en build (SSG/ISR en Vercel)
const fallbackUrl = "https://placeholder-project.supabase.co";
const fallbackKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && !url.includes("your-project") && !url.includes("placeholder") && key);
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackKey;

  return createBrowserClient(url, key);
}
