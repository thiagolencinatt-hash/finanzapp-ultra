import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDemoAccounts,
  addDemoAccount,
  updateDemoAccount,
  deleteDemoAccount,
  resetAllAccountBalances,
} from "@/lib/demo-data";

// GET /api/accounts
export async function GET(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  if (isDemo) return NextResponse.json(getDemoAccounts());

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(getDemoAccounts());

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at");

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(getDemoAccounts());
  }
}

// POST /api/accounts
export async function POST(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const body = await req.json();

  if (isDemo) {
    const newAcc = addDemoAccount(body);
    return NextResponse.json(newAcc, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const newAcc = addDemoAccount(body);
      return NextResponse.json(newAcc, { status: 201 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({ ...body, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch {
    const newAcc = addDemoAccount(body);
    return NextResponse.json(newAcc, { status: 201 });
  }
}

// PATCH /api/accounts (Edición de saldos / cuentas)
export async function PATCH(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const body = await req.json();
  const { id, action, ...updates } = body;

  // Acción especial: resetear todos los saldos a 0
  if (action === "reset_all_balances") {
    resetAllAccountBalances();
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("accounts").update({ balance: 0 }).eq("user_id", user.id).eq("is_active", true);
      }
    } catch {
      // fallback to demo
    }
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  if (updates.balance !== undefined) {
    updates.balance = parseFloat(updates.balance) || 0;
  }

  if (isDemo) {
    const updated = updateDemoAccount(id, updates);
    return NextResponse.json(updated || { success: true });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("accounts").update(updates).eq("id", id).eq("user_id", user.id);
    }
  } catch {
    // fallback
  }

  const updated = updateDemoAccount(id, updates);
  return NextResponse.json(updated || { success: true });
}

// DELETE /api/accounts
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteDemoAccount(id);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("accounts").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
    }
  } catch {
    // fallback
  }

  return NextResponse.json({ success: true });
}
