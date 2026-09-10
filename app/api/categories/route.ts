import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getUserCategories } from "@/lib/db/cloud-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const categories = getUserCategories(user.id);
    return NextResponse.json(categories);
  } catch (err: unknown) {
    console.error("[/api/categories GET error]:", err);
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}
