export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder"),
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  let dbPing = false;
  let errorMsg = undefined;

  if (envCheck.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createAdminClient();
      const { error } = await supabase.from("accounts").select("id").limit(1);
      if (error) {
        errorMsg = error.message;
      } else {
        dbPing = true;
      }
    } catch (err: any) {
      errorMsg = err.message;
    }
  }

  const isHealthy = envCheck.NEXT_PUBLIC_SUPABASE_URL && (envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY || envCheck.SUPABASE_SERVICE_ROLE_KEY) && dbPing;

  return NextResponse.json({
    status: isHealthy ? "ok" : "degraded",
    envCheck,
    dbPing,
    error: errorMsg,
  });
}
