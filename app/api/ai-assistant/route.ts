import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genai, GEMINI_MODEL } from "@/lib/gemini/client";
import { financialTools } from "@/lib/gemini/tools";
import { buildSystemPrompt } from "@/lib/gemini/prompts";
import type { ExecutedAction, FinancialSummary } from "@/lib/types";
import { getDemoSummary } from "@/lib/demo-data";

// Memoria de chat en demo
const inMemoryChat: { id: string; role: "user" | "assistant"; content: string; created_at: string; metadata?: { actions?: ExecutedAction[] } }[] = [];

// POST /api/ai-assistant
export async function POST(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  const { message, session_id } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  let summary: FinancialSummary = getDemoSummary();

  try {
    const summaryRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/summary`, {
      headers: { Cookie: req.headers.get("cookie") || "" },
    });
    if (summaryRes.ok) summary = await summaryRes.json();
  } catch {
    // fallback
  }

  const financialContext = buildFinancialContext(summary);

  // Intentar usar Gemini si la clave está configurada
  const apiKey = process.env.GEMINI_API_KEY;
  const isGeminiConfigured = apiKey && apiKey.length > 10 && !apiKey.includes("your-gemini");

  if (isGeminiConfigured) {
    try {
      let supabase = null;
      let user = null;
      try {
        supabase = await createClient();
        const authData = await supabase.auth.getUser();
        user = authData.data?.user || null;
      } catch {
        // ignore
      }

      const systemInstruction = buildSystemPrompt(financialContext);
      const chat = genai.chats.create({
        model: GEMINI_MODEL,
        config: {
          systemInstruction,
          tools: financialTools,
          temperature: 0.7,
        },
      });

      let response = await chat.sendMessage({ message });
      const executedActions: ExecutedAction[] = [];
      let maxIterations = 5;

      while (response.functionCalls && response.functionCalls.length > 0 && maxIterations > 0) {
        maxIterations--;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResults: any[] = [];

        for (const call of response.functionCalls) {
          const result = await executeTool(call.name!, call.args as Record<string, unknown>, user?.id || "demo-user", supabase);
          toolResults.push({
            functionResponse: {
              id: call.id,
              name: call.name!,
              response: { output: JSON.stringify(result.data), error: result.error },
            },
          });
          executedActions.push({
            tool: call.name!,
            status: result.error ? "error" : "success",
            summary: result.summary,
            data: result.data,
          });
        }

        response = await chat.sendMessage({ message: toolResults });
      }

      const assistantText = response.text || "He procesado tu consulta.";
      return NextResponse.json({ message: assistantText, actions: executedActions });
    } catch (err) {
      console.warn("Gemini call failed, falling back to smart local advisor:", err);
    }
  }

  // Respuesta inteligente local simulada basada en el contexto financiero
  const fallbackResponse = generateSmartAdvisorReply(message, summary);

  inMemoryChat.push({
    id: "user-" + Date.now(),
    role: "user",
    content: message,
    created_at: new Date().toISOString(),
  });

  inMemoryChat.push({
    id: "ai-" + Date.now(),
    role: "assistant",
    content: fallbackResponse.text,
    created_at: new Date().toISOString(),
    metadata: { actions: fallbackResponse.actions },
  });

  return NextResponse.json({
    message: fallbackResponse.text,
    actions: fallbackResponse.actions,
  });
}

// GET /api/ai-assistant — obtener historial de chat
export async function GET(req: NextRequest) {
  const isDemo = req.cookies.get("finance_demo_session")?.value === "true";
  if (isDemo) return NextResponse.json(inMemoryChat);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(inMemoryChat);

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || "default";
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data, error } = await supabase
      .from("ai_memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(inMemoryChat);
  }
}

function generateSmartAdvisorReply(prompt: string, summary: FinancialSummary): { text: string; actions: ExecutedAction[] } {
  const lower = prompt.toLowerCase();
  const netFlow = (summary.income_30d || 0) - (summary.expense_30d || 0);

  if (lower.includes("resumen") || lower.includes("situación") || lower.includes("balance")) {
    return {
      text: `📊 **Tu Resumen Financiero:**\n\n- **Patrimonio total en cuentas:** $${(summary.total_balance || 0).toLocaleString("es-AR")} ARS\n- **Ingresos últimos 30 días:** $${(summary.income_30d || 0).toLocaleString("es-AR")}\n- **Gastos últimos 30 días:** $${(summary.expense_30d || 0).toLocaleString("es-AR")}\n- **Flujo neto:** ${netFlow >= 0 ? `+$${netFlow.toLocaleString("es-AR")} (Superávit 🎉)` : `-$${Math.abs(netFlow).toLocaleString("es-AR")} (Déficit ⚠️)`}\n\nTenés **${summary.active_installments?.length || 0} cuotas activas** por un total de $${(summary.total_installments_monthly || 0).toLocaleString("es-AR")}/mes.`,
      actions: [],
    };
  }

  if (lower.includes("cuota") || lower.includes("deuda") || lower.includes("debo")) {
    const installmentsText = (summary.active_installments || [])
      .map((i) => `• **${i.description}**: $${(i.installment_amount || 0).toLocaleString("es-AR")}/mes (${i.paid_installments}/${i.total_installments} pagadas)`)
      .join("\n");

    return {
      text: `💳 **Detalle de tus Cuotas y Compromisos:**\n\nTiene comprometido un total de **$${(summary.total_installments_monthly || 0).toLocaleString("es-AR")} este mes**.\n\n${installmentsText || "No tenés cuotas activas."}\n\n💡 *Consejo:* Recordá revisar la fecha de vencimiento de tus tarjetas para evitar intereses compensatorios.`,
      actions: [],
    };
  }

  if (lower.includes("gastos") || lower.includes("patron") || lower.includes("analiz")) {
    const topCat = summary.top_categories?.[0]?.category_name || "Servicios";
    return {
      text: `📈 **Análisis de Gastos de los últimos 30 días:**\n\n1. Tu principal rubro de egresos es **${topCat}**.\n2. Tus gastos representan el **${summary.income_30d ? Math.round(((summary.expense_30d || 0) / summary.income_30d) * 100) : 0}%** de tus ingresos mensuales.\n3. Tus compromisos en cuotas representan el **${summary.income_30d ? Math.round(((summary.total_installments_monthly || 0) / summary.income_30d) * 100) : 0}%** de tus ingresos.\n\n✅ Se recomienda mantener los gastos fijos por debajo del 50% de los ingresos totales.`,
      actions: [],
    };
  }

  if (lower.includes("ahorr") || lower.includes("consejo") || lower.includes("meta")) {
    return {
      text: `💡 **3 Consejos de Ahorro Personalizados:**\n\n1. **Fondo de Emergencia:** Priorizá alcanzar 3 a 6 meses de costos fijos en una cuenta remunerada o dólares físicos.\n2. **Cuotas sin Interés:** Antes de comprar en cuotas, verificá el CFT (Costo Financiero Total) en la Calculadora de Cuotas.\n3. **Presupuesto Hormiga:** Reducí un 10% en gastos de salidas/delivery y destiná la diferencia automáticamente a tus metas de ahorro.`,
      actions: [],
    };
  }

  return {
    text: `¡Hola! Soy tu asistente **FinanzApp AI**. Puedo ayudarte a analizar tus finanzas, calcular cuotas con CFT, proyectar metas de ahorro o registrar gastos e ingresos. ¿En qué te puedo ayudar hoy?`,
    actions: [],
  };
}

// ============================================================
// Ejecutar tool calls de Gemini en Supabase
// ============================================================
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{ data: unknown; error?: string; summary: string }> {
  try {
    switch (name) {
      case "create_transaction": {
        if (!supabase) return { data: args, summary: `Transacción registrada: $${args.amount}` };
        const { data, error } = await supabase.from("transactions").insert({
          user_id: userId,
          type: args.type,
          amount: args.amount,
          currency: args.currency || "ARS",
          description: args.description || "",
          date: args.date || new Date().toISOString().split("T")[0],
        }).select().single();

        if (error) return { data: null, error: error.message, summary: "Error al crear transacción" };
        return { data, summary: `✅ Transacción de $${args.amount} registrada exitosamente.` };
      }
      default:
        return { data: args, summary: `Acción ${name} ejecutada` };
    }
  } catch (err) {
    return { data: null, error: String(err), summary: "Error al ejecutar acción" };
  }
}

function buildFinancialContext(summary: Partial<FinancialSummary>): string {
  if (!summary.accounts) return "Sin datos financieros disponibles aún.";
  const accountsList = summary.accounts.map((a) => `  - ${a.name}: $${a.balance?.toLocaleString("es-AR")} ${a.currency}`).join("\n");
  return `CUENTAS:\n${accountsList}\nBALANCE TOTAL: $${summary.total_balance?.toLocaleString("es-AR") || 0} ARS\nINGRESOS 30D: $${summary.income_30d || 0}\nGASTOS 30D: $${summary.expense_30d || 0}`;
}
