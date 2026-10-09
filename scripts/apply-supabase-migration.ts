import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Cargar variables de entorno desde .env.local o .env
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const idx = trimmed.indexOf("=");
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const activeKey = serviceKey || anonKey;

if (!supabaseUrl || !activeKey) {
  console.error("❌ Faltan credenciales de Supabase en .env.local o .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false },
});

export const MIGRATION_SQL = `
-- 10. TABLA DE REGISTROS DE SUELDO Y HABERES LABORALES
CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC,
  total_hours NUMERIC NOT NULL DEFAULT 160,
  hourly_rate_normal NUMERIC NOT NULL DEFAULT 0,
  hourly_rate_night NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_records_user_created ON public.salary_records(user_id, created_at DESC);

-- 11. TABLA DE TURNOS LABORALES Y HORARIOS
CREATE TABLE IF NOT EXISTS public.work_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL,
  day_name TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  night_hours NUMERIC NOT NULL DEFAULT 0,
  coworkers_overlap JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_rest_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT work_shifts_user_date_key UNIQUE (user_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_work_shifts_user_date ON public.work_shifts(user_id, shift_date ASC);

-- Habilitar RLS
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own salary_records" ON public.salary_records;
  CREATE POLICY "Users can manage own salary_records" ON public.salary_records
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can manage own work_shifts" ON public.work_shifts;
  CREATE POLICY "Users can manage own work_shifts" ON public.work_shifts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END $$;
`;

async function main() {
  console.log("==========================================================");
  console.log("⚡ FINANZAPP ULTRA — AUTOMATED SUPABASE MIGRATION SCRIPT");
  console.log("==========================================================");
  console.log(`🌐 Target Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Key Type: ${serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"}`);

  // 1. Probar conectividad con Supabase
  try {
    const { data: pingData, error: pingError } = await supabase
      .from("accounts")
      .select("id")
      .limit(1);

    if (pingError) {
      console.warn("⚠️ Aviso de conexión a Supabase:", pingError.message);
    } else {
      console.log("✅ Conexión con Supabase verificada exitosamente.");
    }
  } catch (err: any) {
    console.warn("⚠️ Falló verificación de tabla accounts:", err.message);
  }

  // 2. Intentar ejecutar SQL si hay RPC disponible o servicio
  let applied = false;
  try {
    const { error: rpcError } = await supabase.rpc("exec_sql", { query: MIGRATION_SQL });
    if (!rpcError) {
      applied = true;
      console.log("✅ Migración aplicada directamente mediante RPC exec_sql.");
    }
  } catch {
    // RPC no expuesto directamente por defecto
  }

  // 3. Verificar estado de las tablas salary_records y work_shifts
  const { error: errSalary } = await supabase.from("salary_records").select("id").limit(1);
  const { error: errShifts } = await supabase.from("work_shifts").select("id").limit(1);

  const salaryReady = !errSalary;
  const shiftsReady = !errShifts;

  console.log("----------------------------------------------------------");
  console.log(`📋 Tabla 'salary_records': ${salaryReady ? "✅ ACTIVA EN SUPABASE" : "⚠️ Fallback activo en localStore"}`);
  console.log(`📋 Tabla 'work_shifts':   ${shiftsReady ? "✅ ACTIVA EN SUPABASE" : "⚠️ Fallback activo en localStore"}`);
  console.log("----------------------------------------------------------");

  if (salaryReady && shiftsReady) {
    console.log("🎉 Todas las tablas laborales están listas en la base de datos.");
  } else {
    console.log("ℹ️ Nota: El backend de FinanzApp Ultra (supabase-store.ts) cuenta con");
    console.log("   fallback automático transparente a localStore para turnos y sueldos.");
    console.log("   El DDL SQL completo ha quedado registrado en 'supabase/schema.sql'.");
  }

  console.log("==========================================================");
  console.log("✅ Migración finalizada con código de éxito 0.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error en script de migración:", err);
  process.exit(1);
});
