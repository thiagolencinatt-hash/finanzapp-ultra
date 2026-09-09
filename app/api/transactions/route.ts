import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDemoTransactions,
  addDemoTransaction,
  updateDemoTransaction,
  deleteDemoTransaction,
  clearAllDemoTransactions,
} from "@/lib/demo-data";

// GET /api/transactions
export async function GET(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const type = searchParams.get("type");
  const categoryId = searchParams.get("category_id");
  const accountId = searchParams.get("account_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (isDemo) {
    let filtered = [...getDemoTransactions()];
    if (type) filtered = filtered.filter((t) => t.type === type);
    if (accountId) filtered = filtered.filter((t) => t.account_id === accountId);
    if (categoryId) filtered = filtered.filter((t) => t.category_id === categoryId);
    if (from) filtered = filtered.filter((t) => t.date >= from);
    if (to) filtered = filtered.filter((t) => t.date <= to);

    const data = filtered.slice(offset, offset + limit);
    return NextResponse.json({ data, count: filtered.length, limit, offset });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      let filtered = [...getDemoTransactions()];
      if (type) filtered = filtered.filter((t) => t.type === type);
      if (accountId) filtered = filtered.filter((t) => t.account_id === accountId);
      if (categoryId) filtered = filtered.filter((t) => t.category_id === categoryId);
      if (from) filtered = filtered.filter((t) => t.date >= from);
      if (to) filtered = filtered.filter((t) => t.date <= to);

      const data = filtered.slice(offset, offset + limit);
      return NextResponse.json({ data, count: filtered.length, limit, offset });
    }

    let query = supabase
      .from("transactions")
      .select(`
        *,
        account:accounts(id, name, color, icon),
        category:categories(id, name, color, icon),
        transfer_to_account:accounts!transfer_to_account_id(id, name, color, icon)
      `, { count: "exact" })
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq("type", type);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (accountId) query = query.eq("account_id", accountId);
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count, limit, offset });
  } catch {
    let filtered = [...getDemoTransactions()];
    if (type) filtered = filtered.filter((t) => t.type === type);
    if (accountId) filtered = filtered.filter((t) => t.account_id === accountId);
    if (categoryId) filtered = filtered.filter((t) => t.category_id === categoryId);
    const data = filtered.slice(offset, offset + limit);
    return NextResponse.json({ data, count: filtered.length, limit, offset });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const body = await req.json();

  if (isDemo) {
    const newTx = addDemoTransaction(body);
    return NextResponse.json(newTx, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const newTx = addDemoTransaction(body);
      return NextResponse.json(newTx, { status: 201 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...body, user_id: user.id })
      .select(`
        *,
        account:accounts(id, name, color, icon),
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch {
    const newTx = addDemoTransaction(body);
    return NextResponse.json(newTx, { status: 201 });
  }
}

// PATCH /api/transactions (Edición de transacciones)
export async function PATCH(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  if (isDemo) {
    const updated = updateDemoTransaction(id, updates);
    return NextResponse.json(updated || { success: true });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const updated = updateDemoTransaction(id, updates);
      return NextResponse.json(updated || { success: true });
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(`
        *,
        account:accounts(id, name, color, icon),
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    const updated = updateDemoTransaction(id, updates);
    return NextResponse.json(updated || { success: true });
  }
}

// DELETE /api/transactions
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id, action } = body;

  // Borrar todas las transacciones
  if (action === "clear_all") {
    clearAllDemoTransactions();
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("transactions").delete().eq("user_id", user.id);
      }
    } catch {
      // fallback
    }
    return NextResponse.json({ success: true });
  }

  deleteDemoTransaction(id);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    }
  } catch {
    // fallback
  }

  return NextResponse.json({ success: true });
}
