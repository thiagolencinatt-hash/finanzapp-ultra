import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let supabaseStatus = "disconnected";
  let supabaseMessage = "Variables de Supabase no configuradas";

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder")) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.auth.getSession();
      if (!error) {
        supabaseStatus = "connected";
        supabaseMessage = "Conexión activa con Supabase Cloud Auth";
      } else {
        supabaseStatus = "error";
        supabaseMessage = error.message;
      }
    } catch (err: unknown) {
      supabaseStatus = "error";
      supabaseMessage = err instanceof Error ? err.message : "Fallo de conexión";
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || "";
  const hasGemini = geminiKey.length > 10;
  const hasResend = Boolean(process.env.RESEND_API_KEY);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? "vercel_production" : "development_server",
    services: {
      supabase: {
        connected: supabaseStatus === "connected",
        status: supabaseStatus,
        message: supabaseMessage,
        project: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, "").split(".")[0] : null,
      },
      gemini_ai: {
        connected: hasGemini,
        status: hasGemini ? "ready" : "missing_key",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      },
      resend_email: {
        connected: hasResend,
        status: hasResend ? "ready" : "missing_key",
      },
    },
  });
}
