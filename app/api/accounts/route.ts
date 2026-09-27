export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/server";
import {
  addAccount,
  updateAccount,
  deleteAccount,
  getAccounts,
} from "@/lib/db/supabase-store";

// GET /api/accounts
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = await createAdminClient();
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("[/api/accounts GET error from Supabase]:", error);
    }

    if (!accounts || accounts.length === 0) {
      const defaultAccounts = [
        {
          id: crypto.randomUUID(),
          user_id: userId,
          name: "Efectivo",
          type: "cash",
          balance: 0,
          currency: "ARS",
          color: "#10b981",
          icon: "Wallet",
        },
        {
          id: crypto.randomUUID(),
          user_id: userId,
          name: "Mercado Pago",
          type: "wallet",
          balance: 0,
          currency: "ARS",
          color: "#009ee3",
          icon: "Smartphone",
        },
        {
          id: crypto.randomUUID(),
          user_id: userId,
          name: "Banco / Débito",
          type: "bank",
          balance: 0,
          currency: "ARS",
          color: "#6366f1",
          icon: "BuildingLibrary",
        },
      ];

      const { data: inserted, error: insertError } = await supabase
        .from("accounts")
        .insert(defaultAccounts)
        .select();

      if (insertError) {
        console.error("[/api/accounts] Error inserting default accounts:", insertError);
      }

      return NextResponse.json(inserted && inserted.length > 0 ? inserted : defaultAccounts, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    return NextResponse.json(accounts, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("[/api/accounts GET error]:", err);
    return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 });
  }
}

// POST /api/accounts
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const newAcc = await addAccount(user.id, body);
    return NextResponse.json(newAcc, { status: 201 });
  } catch (err: unknown) {
    console.error("[/api/accounts POST error]:", err);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}

// PATCH /api/accounts
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const body = await req.json();
    const { id, action, ...updates } = body;

    // Resetear saldos si se solicita
    if (action === "reset_all_balances") {
      const accounts = await getAccounts(user.id);
      for (const acc of accounts) {
        await updateAccount(user.id, acc.id, { balance: 0 });
      }
      const updatedAccounts = await getAccounts(user.id);
      return NextResponse.json({ success: true, accounts: updatedAccounts });
    }

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (updates.balance !== undefined) {
      updates.balance = parseFloat(updates.balance) || 0;
    }

    const updated = await updateAccount(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("[/api/accounts PATCH error]:", err);
    return NextResponse.json({ error: "Error al actualizar cuenta" }, { status: 500 });
  }
}

// DELETE /api/accounts
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const deleted = await deleteAccount(user.id, id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error("[/api/accounts DELETE error]:", err);
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
