#!/usr/bin/env node
/**
 * GEL-032: Script de diagnóstico y migración de user_id en Supabase
 * 
 * Propósito:
 *   1. Calcula el getDeterministicUserId(email) para TU email
 *   2. Consulta qué user_ids existen en las tablas accounts y transactions
 *   3. Si hay un mismatch, migra automáticamente los datos al ID correcto
 * 
 * Uso:
 *   node scripts/fix-user-id.js tu@email.com
 *   node scripts/fix-user-id.js tu@email.com --migrate
 */

const crypto = require("crypto");
const https = require("https");

// =========================================================
// Función determinística IDÉNTICA a lib/auth/user-store.ts
// =========================================================
function getDeterministicUserId(email) {
  const normalized = (email || "").toLowerCase().trim();
  const hash = crypto
    .createHash("sha256")
    .update("finanzapp-v1:" + normalized)
    .digest("hex");
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = "4" + hash.substring(13, 16);
  const p4 =
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0") + hash.substring(18, 20);
  const p5 = hash.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

// =========================================================
// Config de Supabase (desde .env.local)
// =========================================================
require("fs");
const path = require("path");

function loadEnv() {
  const envFile = path.join(__dirname, "..", ".env.local");
  const fs = require("fs");
  if (!fs.existsSync(envFile)) {
    console.error("❌ No se encontró .env.local");
    process.exit(1);
  }
  const lines = fs.readFileSync(envFile, "utf-8").split("\n");
  const env = {};
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

async function supabaseQuery(table, filter = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=user_id${filter}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function supabaseUpdate(table, oldUserId, newUserId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ user_id: newUserId });
    const url = new URL(
      `${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${encodeURIComponent(oldUserId)}`
    );
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const shouldMigrate = args.includes("--migrate");

  if (!email || !email.includes("@")) {
    console.log(`
Uso: node scripts/fix-user-id.js <email> [--migrate]

Ejemplos:
  node scripts/fix-user-id.js tu@email.com          # Solo diagnóstico
  node scripts/fix-user-id.js tu@email.com --migrate # Diagnóstico + migración
`);
    process.exit(0);
  }

  const correctId = getDeterministicUserId(email);
  console.log(`\n🔍 [GEL-032] Diagnóstico de identidad en Supabase`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📧 Email normalizado : ${email.toLowerCase().trim()}`);
  console.log(`🆔 ID correcto (SHA-256): ${correctId}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const TABLES = ["accounts", "transactions", "installments", "savings_goals", "subscriptions", "ai_memories"];

  for (const table of TABLES) {
    try {
      const rows = await supabaseQuery(table);
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`📋 ${table}: sin filas`);
        continue;
      }

      // Contar filas por user_id
      const counts = {};
      for (const row of rows) {
        const uid = row.user_id || "(null)";
        counts[uid] = (counts[uid] || 0) + 1;
      }

      const foreignIds = Object.keys(counts).filter((id) => id !== correctId);
      const correctCount = counts[correctId] || 0;

      console.log(`📋 ${table}:`);
      console.log(`   ✅ Filas con ID correcto  : ${correctCount}`);

      if (foreignIds.length > 0) {
        for (const fid of foreignIds) {
          console.log(`   ⚠️  ID extraño (${counts[fid]} filas) : ${fid}`);
        }

        if (shouldMigrate) {
          for (const fid of foreignIds) {
            if (fid === "(null)") continue;
            console.log(`   🔄 Migrando ${counts[fid]} fila(s) de ${fid} → ${correctId} ...`);
            const result = await supabaseUpdate(table, fid, correctId);
            if (result.status >= 200 && result.status < 300) {
              console.log(`   ✅ Migración exitosa en ${table}`);
            } else {
              console.log(`   ❌ Error en migración: ${JSON.stringify(result.data)}`);
            }
          }
        } else {
          console.log(`   💡 Ejecutá con --migrate para corregir automáticamente`);
        }
      } else {
        console.log(`   🎉 Todos los registros tienen el ID correcto`);
      }
      console.log();
    } catch (err) {
      console.log(`   ❌ Error consultando ${table}: ${err.message}`);
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (!shouldMigrate) {
    console.log(`\n📌 Para migrar los IDs, ejecutá:\n   node scripts/fix-user-id.js ${email} --migrate\n`);
  } else {
    console.log(`\n✅ Migración completada. Iniciá sesión con tu correo y contraseña.`);
    console.log(`   Deberías ver tus fondos y transacciones al instante.\n`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
