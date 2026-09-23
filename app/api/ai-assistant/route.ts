import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";
import { financialTools } from "@/lib/gemini/tools";
import { buildSystemPrompt } from "@/lib/gemini/prompts";
import type { ExecutedAction, FinancialSummary } from "@/lib/types";
import {
  getSummary,
  addTransaction,
  addInstallment,
  addGoal,
  updateGoal,
  getGoals,
  getChatMessages,
  addChatMessage,
} from "@/lib/db/supabase-store";

// Rate Limiter — 30 solicitudes por minuto por IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30;
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

const MAX_IMAGE_BASE64_LENGTH = 7_000_000; // ~5MB

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const messages = await getChatMessages(user.id, 30);
    return NextResponse.json(messages);
  } catch (err: unknown) {
    console.error("[/api/ai-assistant GET error]:", err);
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá unos segundos antes de reintentar." },
        { status: 429 }
      );
    }

    let user;
    try {
      user = await getUserFromRequest(req);
    } catch {
      user = {
        id: "demo-user",
        email: "demo@finanzapp.com",
        name: "Usuario",
        currency: "ARS",
        salary: 980000,
        isDemo: true,
      };
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { message, image_base64, image_mime_type } = body as {
      message?: string;
      image_base64?: string;
      image_mime_type?: string;
    };

    if (!message?.trim() && !image_base64) {
      return NextResponse.json({ error: "Mensaje o imagen requeridos" }, { status: 400 });
    }

    if (image_base64 && image_base64.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "La imagen es demasiado pesada. Máximo 5MB." },
        { status: 413 }
      );
    }

    let summary: FinancialSummary;
    try {
      summary = await getSummary(user.id, {
        email: user.email,
        name: user.name,
        currency: user.currency,
        salary: user.salary,
      });
    } catch {
      summary = {
        accounts: [],
        total_balance: 0,
        total_balance_ars: 0,
        income_30d: user.salary || 980000,
        expense_30d: 0,
        total_installments_monthly: 0,
        upcoming_installments: [],
        top_categories: [],
        active_installments: [],
        savings_goals: [],
      };
    }

    const financialContext = buildFinancialContext(summary);
    const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your-gemini"));

    if (isGeminiConfigured) {
      try {
        const systemInstruction = buildSystemPrompt(financialContext);
        const genai = getGenAI();

        // Recuperar últimos 6 mensajes para contexto conversacional
        let history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
        try {
          const previousMessages = await getChatMessages(user.id, 6);
          for (const prev of previousMessages) {
            if (!prev.content?.trim()) continue;
            const role = prev.role === "assistant" ? "model" : "user";
            if (history.length === 0 && role !== "user") continue;
            if (history.length > 0 && history[history.length - 1].role === role) continue;
            history.push({
              role,
              parts: [{ text: prev.content }],
            });
          }
        } catch {
          history = [];
        }

        let lastError = null;

        for (const modelName of GEMINI_FALLBACK_MODELS) {
          try {
            const chat = genai.chats.create({
              model: modelName,
              history: history.length > 0 ? history : undefined,
              config: {
                systemInstruction: systemInstruction + "\nREGLA ESTRICTA: Cuando el usuario te pida registrar o agregar plata (ingreso/gasto), DEBES y TIENES QUE usar SIEMPRE la herramienta 'create_transaction'. NUNCA respondas diciendo 'ya lo registré' sin haber llamado a la herramienta. Solo responde texto para confirmar o analizar, pero la acción DEBE ejecutarse.",
                tools: financialTools,
                temperature: 0.2,
              },
            });

            const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];

            if (image_base64) {
              const mime = image_mime_type || "image/jpeg";
              contents.push({
                inlineData: {
                  mimeType: mime,
                  data: image_base64, // Ya viene limpio desde el cliente (split)
                },
              });
              
              if (mime.startsWith("image/")) {
                contents.push(
                  `[VISIÓN ARTIFICIAL OCR]: Analizá esta foto de comprobante, ticket de compra, factura o recibo. Extraé comercio, fecha, monto exacto e inferí la categoría. Registrá o proponé el gasto usando create_transaction.`
                );
              } else {
                contents.push(
                  `[ANÁLISIS DE DOCUMENTO]: Analizá este documento (PDF, Excel, Word o CSV). Extraé los gastos, ingresos, saldos o información financiera detallada. Procesalos en lote si corresponde y usá las herramientas (create_transaction, etc.) para registrarlos automáticamente de ser necesario.`
                );
              }
            }

            if (message?.trim()) {
              contents.push(message.trim());
            }

            const sendPromise = chat.sendMessage({ message: contents });
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Gemini timeout (25s)")), 25000)
            );

            let response = await Promise.race([sendPromise, timeoutPromise]);
            const executedActions: ExecutedAction[] = [];

            // Procesar llamadas a herramientas (function calling)
            while (response.functionCalls && response.functionCalls.length > 0) {
              const toolResults = [];

              for (const call of response.functionCalls) {
                if (!call.name) continue;
                const result = await executeTool(call.name, (call.args as Record<string, unknown>) || {}, user.id);
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
                  setTimeout(() => reject(new Error("Tool timeout (12s)")), 12000)
                );
                response = await Promise.race([toolSendPromise, toolTimeoutPromise]);
              } catch (toolErr) {
                console.warn("Tool submission notice:", toolErr);
                break;
              }
            }

            let assistantText = response.text;
            if (!assistantText && executedActions.length > 0) {
              assistantText = executedActions.map((a) => a.summary).join("\n");
            }
            if (!assistantText) {
              assistantText = "He analizado tus datos y procesado la solicitud correctamente.";
            }

            // Guardar mensajes en DB de forma segura sin bloquear respuesta
            try {
              await addChatMessage(user.id, "user", message || "[Foto de ticket o comprobante enviada]");
              await addChatMessage(user.id, "assistant", assistantText);
            } catch (dbErr) {
              console.warn("Could not persist chat message:", dbErr);
            }

            return NextResponse.json({
              message: assistantText,
              actions: executedActions,
              model: modelName,
            });
          } catch (modelErr: unknown) {
            lastError = modelErr;
            console.warn(`Model ${modelName} encountered issue, trying fallback...`, modelErr);
            continue;
          }
        }
        if (lastError) throw lastError;
      } catch (err) {
        console.warn("Gemini call failed, using resilient local advisor:", err);
      }
    }

    // Fallback Asesor Financiero inteligente local
    const advisor = generateSmartAdvisorReply(message || "", summary);
    try {
      await addChatMessage(user.id, "user", message || "Consulta financiera");
      await addChatMessage(user.id, "assistant", advisor.text);
    } catch {
      // silent
    }

    return NextResponse.json({
      message: advisor.text,
      actions: advisor.actions,
      model: "FinanzApp Smart Advisor",
    });
  } catch (globalErr: unknown) {
    const errorMsg = globalErr instanceof Error ? globalErr.message : "Error inesperado en el asistente IA";
    console.error("[/api/ai-assistant fatal error]:", globalErr);
    return NextResponse.json(
      {
        message: "Ocurrió un inconveniente temporal al conectar con la IA. Por favor reintentá en un instante.",
        error: errorMsg,
        actions: [],
        model: "offline-fallback",
      },
      { status: 200 } // Devolver 200 con mensaje amigable para no congelar la UI
    );
  }
}

// Ejecutor de Function Calling conectado a Supabase
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ data: unknown; error?: string; summary: string }> {
  try {
    switch (name) {
      case "create_transaction": {
        const amount = Number(args.amount) || 0;
        const type = (args.type as "income" | "expense") || "expense";
        const description = (args.description as string) || (args.category_name as string) || "Operación IA";
        const date = (args.date as string) || new Date().toISOString();

        let payload: any = {
          id: crypto.randomUUID(),
          user_id: userId,
          amount,
          type,
          description,
          date,
          account_id: "", // Se resolverá en addTransaction con ensureDefaultAccount()
          account_name: args.account_name || "Efectivo",
          created_at: new Date().toISOString(),
          synced: false
        };

        try {
          const newTx = await addTransaction(userId, {
            user_id: userId,
            type,
            amount,
            description,
            date,
          });
          payload = { ...newTx, synced: true };
        } catch (e) {
          console.warn("AI DB write failed, deferring to local-first client storage", e);
        }

        return {
          data: { action: "create_transaction", transaction: payload },
          summary: `✅ ${type === "income" ? "Ingreso" : "Gasto"} de $${amount.toLocaleString("es-AR")} registrado.`,
        };
      }

      case "create_installment": {
        const totalAmount = Number(args.total_amount) || 0;
        const totalInstallments = Number(args.total_installments) || 1;
        const description = (args.description as string) || "Compra en cuotas";
        const interestRate = Number(args.interest_rate) || 0;

        const newInst = await addInstallment(userId, {
          description,
          item_name: description,
          card_name: (args.account_name as string) || "Tarjeta de Crédito",
          total_amount: totalAmount,
          total_installments: totalInstallments,
          interest_rate: interestRate,
          has_interest: interestRate > 0,
        });

        return {
          data: newInst,
          summary: `💳 Compra "${description}" (${totalInstallments} cuotas de $${newInst.installment_amount.toLocaleString("es-AR")}) guardada exitosamente.`,
        };
      }

      case "create_savings_goal": {
        const goalName = (args.name as string) || "Nueva Meta";
        const targetAmount = Number(args.target_amount) || 100000;

        const newGoal = await addGoal(userId, {
          name: goalName,
          target_amount: targetAmount,
        });

        return {
          data: newGoal,
          summary: `🎯 Meta "${goalName}" de $${targetAmount.toLocaleString("es-AR")} creada exitosamente.`,
        };
      }

      // FASE 3: Herramienta distribute_income
      case "distribute_income": {
        const incomeAmount = Number(args.income_amount) || 0;
        const allocations = (args.allocations as Array<{
          goal_name: string;
          amount: number;
          percentage?: number;
        }>) || [];

        const goals = await getGoals(userId);
        const appliedSummaries: string[] = [];

        for (const alloc of allocations) {
          const match = goals.find((g) =>
            g.name.toLowerCase().includes(alloc.goal_name.toLowerCase())
          );

          if (match) {
            const newBal = (Number(match.current_amount) || 0) + alloc.amount;
            await updateGoal(userId, match.id, { current_amount: newBal });
            appliedSummaries.push(`${match.name}: +$${alloc.amount.toLocaleString("es-AR")}`);
          } else {
            await addGoal(userId, {
              name: alloc.goal_name,
              target_amount: alloc.amount * 5,
              current_amount: alloc.amount,
            });
            appliedSummaries.push(`${alloc.goal_name} (Nueva): +$${alloc.amount.toLocaleString("es-AR")}`);
          }
        }

        return {
          data: { incomeAmount, allocations },
          summary: `💰 Ingreso de $${incomeAmount.toLocaleString("es-AR")} distribuido con éxito:\n${appliedSummaries.join("\n")}`,
        };
      }

      default:
        return { data: args, summary: `Acción ${name} ejecutada` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: msg, summary: "Error al ejecutar la acción" };
  }
}

function buildFinancialContext(summary: FinancialSummary): string {
  const accountsList = (summary.accounts || [])
    .map((a) => `  - ${a.name}: $${a.balance?.toLocaleString("es-AR")} ${a.currency}`)
    .join("\n");

  const goalsList = (summary.savings_goals || [])
    .map((g) => `  - ${g.name}: $${g.current_amount?.toLocaleString("es-AR")} / $${g.target_amount?.toLocaleString("es-AR")}`)
    .join("\n");

  const installmentsList = (summary.active_installments || [])
    .map((i) => `  - ${i.description} (${i.account_name || "Tarjeta"}): $${i.installment_amount?.toLocaleString("es-AR")}/mes (${i.paid_installments}/${i.total_installments} pagadas)`)
    .join("\n");

  const freeIncome =
    (summary.configured_salary || 800000) -
    (summary.expense_30d || 0) -
    (summary.total_installments_monthly || 0) -
    (summary.total_subscriptions_monthly || 0);

  return `
ESTADO DE CUENTAS:
${accountsList || "  - Sin cuentas registradas"}
TOTAL SALDO: $${(summary.total_balance || 0).toLocaleString("es-AR")} ARS
SUELDO DECLARADO: $${(summary.configured_salary || 800000).toLocaleString("es-AR")} ARS
INGRESOS ULTIMOS 30 DIAS: $${(summary.income_30d || 0).toLocaleString("es-AR")} ARS
GASTOS ULTIMOS 30 DIAS: $${(summary.expense_30d || 0).toLocaleString("es-AR")} ARS
COMPROMISO MENSUAL EN CUOTAS: $${(summary.total_installments_monthly || 0).toLocaleString("es-AR")} ARS
GASTO FIJO MENSUAL SUSCRIPCIONES: $${(summary.total_subscriptions_monthly || 0).toLocaleString("es-AR")} ARS
SUELDO LIBRE ESTIMADO: $${freeIncome.toLocaleString("es-AR")} ARS

METAS DE AHORRO ACTIVAS:
${goalsList || "  - Sin metas de ahorro aún"}

CUOTAS ACTIVAS:
${installmentsList || "  - Sin compras en cuotas pendientes"}
`;
}

function generateSmartAdvisorReply(
  prompt: string,
  summary: FinancialSummary
): { text: string; actions: ExecutedAction[] } {
  const lower = prompt.toLowerCase();
  const freeIncome =
    (summary.configured_salary || 800000) -
    (summary.expense_30d || 0) -
    (summary.total_installments_monthly || 0) -
    (summary.total_subscriptions_monthly || 0);

  if (lower.includes("resumen") || lower.includes("situación") || lower.includes("balance")) {
    return {
      text: `📊 **Tu Resumen Financiero:**\n\n- **Saldo total en cuentas:** $${(summary.total_balance || 0).toLocaleString("es-AR")} ARS\n- **Sueldo:** $${(summary.configured_salary || 800000).toLocaleString("es-AR")}\n- **Gastos 30d:** $${(summary.expense_30d || 0).toLocaleString("es-AR")}\n- **Cuotas del mes:** $${(summary.total_installments_monthly || 0).toLocaleString("es-AR")}\n- **Dinero libre proyectado:** $${freeIncome.toLocaleString("es-AR")} ARS`,
      actions: [],
    };
  }

  if (lower.includes("distribu") || lower.includes("sueldo") || lower.includes("cobré")) {
    return {
      text: `💡 **Sugerencia de Distribución de Ingresos (Regla 50/30/20):**\n\n- **50% Gastos Fijos y Básicos:** Alimentación, servicios y deudas.\n- **30% Gastos Personales y Salidas.**\n- **20% Ahorro e Inversión:** Podés decirme *"Destiná $50.000 a mi meta de ahorro"* y lo aplicaré automáticamente.`,
      actions: [],
    };
  }

  return {
    text: `¡Hola! Soy tu asistente financiero con **Gemini 2.0**. Podés enviarme una foto de un ticket de compra o factura para registrar el gasto automáticamente, o preguntarme cómo optimizar tu presupuesto mensual.`,
    actions: [],
  };
}
