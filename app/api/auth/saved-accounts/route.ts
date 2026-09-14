import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "data");
  }
  return path.join(process.cwd(), "data");
}

export async function GET() {
  try {
    const file = path.join(getDataDir(), "users.json");
    if (!fs.existsSync(file)) {
      return NextResponse.json({ accounts: [] });
    }

    const raw = fs.readFileSync(file, "utf-8");
    const list = JSON.parse(raw);
    
    // Devolver lista pública segura (solo nombre y correo, sin passwords ni salts)
    const accounts = list
      .filter((u: any) => u.email && !u.email.includes("prueba.com") && !u.email.includes("empresa.com"))
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email.split("@")[0],
      }));

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[/api/auth/saved-accounts error]:", err);
    return NextResponse.json({ accounts: [] });
  }
}
