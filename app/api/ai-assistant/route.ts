import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";
import { financialTools } from "@/lib/gemini/tools";
import { buildSystemPrompt } from "@/lib/gemini/prompts";
import type { ExecutedAction, FinancialSummary, ChatMessage } from "@/lib/types";
import {
  getUserSummary,
  addUserTransaction,
  addUserInstallment,
  addUserGoal,
  getUserChatMessages,
  addUserChatMessage,
} from "@/lib/db/cloud-store";

// Rate Limiter — máximo 20 requests por minuto por IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

const MAX_IMAGE_BASE64_LENGTH = 5_600_000;

// POST /api/ai-assistant
export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Esperá un momento antes de intentar de nuevo." },
      { status: 429 }
    );
  }

  const user = await getUserFromRequest(req);
  const body = await req.json();
  const { message, image_base64, image_mime_type } = body;
  if (!message?.trim() && !image_base64) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  if (image_base64 && image_base64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "La imagen es demasiado grande. Máximo 4MB." },
      { status: 413 }
    );
  }

  const summary = getUserSummary(user.id, {
    email: user.email,
    name: user.name,
    currency: user.currency,
    salary: user.salary,
  });

  const financialContext = buildFinancialContext(summary);

  // Intentar usar Gemini si la clave está configurada
  const apiKey = process.env.GEMINI_API_KEY;
  const isGeminiConfigured = apiKey && apiKey.length > 10 && !apiKey.includes("your-gemini");

  if (isGeminiConfigured) {
    try {
      const systemInstruction = buildSystemPrompt(financialContext);
      const genai = getGenAI();

      let lastError = null;
      for (const modelName of GEMINI_FALLBACK_MODELS) {
        try {
          const chat = genai.chats.create({
            model: modelName,
            config: {
              systemInstruction,
              tools: financialTools,
              temperature: 0.7,
            },
          });

          // Historial de usuario
          const previousMessages = getUserChatMessages(user.id, 6);
          for (const prev of previousMessages) {
            if (prev.role === "user" || prev.role === "assistant") {
              try {
                await chat.sendMessage({ message: prev.content });
              } catch {
                // ignore
              }
            }
          }

          const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];
          if (image_base64) {
            contents.push({
              inlineData: {
                mimeType: image_mime_type || "image/jpeg",
                data: image_base64,
              },
            });
          }
          if (message?.trim()) {
            contents.push(message.trim());
          }

          const sendPromise = chat.sendMessage({ message: contents });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini response timeout")), 8000)
          );

          let response = await Promise.race([sendPromise, timeoutPromise]);
          const executedActions: ExecutedAction[] = [];

          // Procesar llamadas a herramientas (function calls)
          while (response.functionCalls && response.functionCalls.length > 0) {
            const toolResults = [];

            for (const call of response.functionCalls) {
              if (!call.name) continue;
              const result = executeTool(call.name, (call.args as Record<string, unknown>) || {}, user.id);
              toolResults.push({
                functionResponse: {
                  name: call.name,
                  response: { output: JSON.stringify(result.data), summary: result.summary, error: result.error },
                },
              });
              executedActions.push({
                tool: call.name,
                status: result.error ? "error" : "success",
                summary: result.summary,
                data: result.data,
              });
            }

            try {
              const toolSendPromise = chat.sendMessage({ message: toolResults });
              const toolTimeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Tool response timeout")), 4000)
              );
              response = await Promise.race([toolSendPromise, toolTimeoutPromise]);
            } catch (toolErr) {
              console.warn("Tool response submission notice:", toolErr);
              break;
            }
          }

          let assistantText = response.text;
          if (!assistantText && executedActions.length > 0) {
            assistantText = executedActions.map((a) => a.summary).join("\n");
          }
          if (!assistantText) assistantText = "He procesado tu consulta exitosamente.";

          // Guardar en memoria persistente del usuario
          addUserChatMessage(user.id, {
            id: `msg-${Date.now()}-u`,
            user_id: user.id,
            role: "user",
            content: message || "Analizar comprobante adjunto",
            created_at: new Date().toISOString(),
          });

          addUserChatMessage(user.id, {
            id: `msg-${Date.now()}-a`,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
            created_at: new Date().toISOString(),
            metadata: { actions: executedActions },
          });

          return NextResponse.json({ message: assistantText, actions: executedActions, model: modelName });
        } catch (modelErr: unknown) {
          lastError = modelErr;
          console.warn(`Model ${modelName} encountered issue, trying fallback...`, modelErr);
          continue;
        }
      }
      if (lastError) throw lastError;
    } catch (err) {
      console.warn("Gemini call failed, falling back to smart local advisor:", err);
    }
  }

  // Respuesta inteligente local simulada basada en el contexto financiero
  const fallbackResponse = generateSmartAdvisorReply(message, summary);

  addUserChatMessage(user.id, {
    id: `msg-${Date.now()}-u`,
    user_id: user.id,
    role: "user",
    content: message,
    created_at: new Date().toISOString(),
  });

  addUserChatMessage(user.id, {
    id: `msg-${Date.now()}-a`,
    user_id: user.id,
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

// GET /api/ai-assistant — obtener historial de chat del usuario
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const messages = getUserChatMessages(user.id, 50);
    return NextResponse.json(messages);
  } catch (err: unknown) {
    console.error("[/api/ai-assistant GET error]:", err);
    return NextResponse.json([]);
  }
}

// Ejecutar tool calls de Gemini persistidas en cloud-store por usuario
function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): { data: unknown; error?: string; summary: string } {
  try {
    switch (name) {
      case "create_transaction": {
        const amount = Number(args.amount) || 0;
        const type = (args.type as "income" | "expense") || "expense";
        const description = (args.description as string) || (args.category_name as string) || "Operación IA";
        const currency = (args.currency as string) || "ARS";
        const date = (args.date as string) || new Date().toISOString().split("T")[0];

        const newTx = addUserTransaction(userId, {
          type,
          amount,
          currency,
          description,
          date,
        });

        return {
          data: newTx,
          summary: `✅ ${type === "income" ? "Ingreso" : "Gasto"} de $${amount.toLocaleString("es-AR")} registrado exitosamente.`,
        };
      }

      case "create_installment": {
        const totalAmount = Number(args.total_amount) || 0;
        const totalInstallments = Number(args.total_installments) || 1;
        const description = (args.description as string) || "Compra en cuotas";
        const hasInterest = Boolean(args.has_interest);
        const interestRate = Number(args.interest_rate) || 0;
        const currency = (args.currency as string) || "ARS";
        const dueDay = Number(args.due_day) || 10;

        const newInst = addUserInstallment(userId, {
          description,
          total_amount: totalAmount,
          total_installments: totalInstallments,
          has_interest: hasInterest,
          interest_rate: interestRate,
          currency,
          due_day: dueDay,
        });

        return {
          data: newInst,
          summary: `💳 Compra "${description}" (${totalInstallments} cuotas de $${(newInst.installment_amount || 0).toLocaleString("es-AR")}) guardada exitosamente.`,
        };
      }

      case "create_savings_goal": {
        const name = (args.name as string) || "Nueva Meta";
        const targetAmount = Number(args.target_amount) || 0;
        const type = (args.type as "goal" | "wishlist") || "goal";
        const monthly = Number(args.monthly_contribution) || 0;
        const currency = (args.currency as string) || "ARS";

        const newGoal = addUserGoal(userId, {
          name,
          target_amount: targetAmount,
          type,
          monthly_contribution: monthly,
          currency,
        });

        return {
          data: newGoal,
          summary: `🎯 Meta "${name}" de $${targetAmount.toLocaleString("es-AR")} guardada exitosamente.`,
        };
      }

      default:
        return { data: args, summary: `Acción ${name} ejecutada` };
    }
  } catch (err) {
    return { data: null, error: String(err), summary: "Error al ejecutar acción" };
  }
}

function buildFinancialContext(summary: Partial<FinancialSummary>): string {
  if (!summary.accounts || summary.accounts.length === 0) return "Sin datos financieros disponibles aún.";
  const accountsList = summary.accounts
    .map((a) => `  - ${a.name}: $${a.balance?.toLocaleString("es-AR")} ${a.currency}`)
    .join("\n");
  return `CUENTAS:\n${accountsList}\nBALANCE TOTAL: $${summary.total_balance?.toLocaleString("es-AR") || 0} ARS\nINGRESOS 30D: $${summary.income_30d || 0}\nGASTOS 30D: $${summary.expense_30d || 0}`;
}

function generateSmartAdvisorReply(prompt: string, summary: FinancialSummary): { text: string; actions: ExecutedAction[] } {
  const lower = prompt.toLowerCase();
  const netFlow = (summary.income_30d || 0) - (summary.expense_30d || 0);

  if (lower.includes("resumen") || lower.includes("situación") || lower.includes("balance") || lower.includes("estado")) {
    return {
      text: `📊 **Tu Resumen Financiero en la Nube:**\n\n- **Patrimonio total en cuentas:** $${(summary.total_balance || 0).toLocaleString("es-AR")} ARS\n- **Ingresos últimos 30 días:** $${(summary.income_30d || 0).toLocaleString("es-AR")}\n- **Gastos últimos 30 días:** $${(summary.expense_30d || 0).toLocaleString("es-AR")}\n- **Flujo neto:** ${netFlow >= 0 ? `+$${netFlow.toLocaleString("es-AR")} (Superávit 🎉)` : `-$${Math.abs(netFlow).toLocaleString("es-AR")} (Déficit ⚠️)`}\n\nTenés **${summary.active_installments?.length || 0} cuotas activas** por un total de $${(summary.total_installments_monthly || 0).toLocaleString("es-AR")}/mes. Todo guardado automáticamente.`,
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
    text: `¡Hola! Soy tu asistente **FinanzApp AI**. Todos los movimientos y consultas se guardan automáticamente en tu cuenta en la nube. ¿En qué te puedo ayudar hoy?`,
    actions: [],
  };
}
