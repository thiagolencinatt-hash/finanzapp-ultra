import type { Tool } from "@google/genai";
import { Type } from "@google/genai";

export const financialTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "create_transaction",
        description:
          "Registra un ingreso o gasto en la base de datos. Úsalo cuando el usuario mencione que gastó o recibió dinero.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ["income", "expense"],
              description: "Tipo de transacción: ingreso o gasto",
            },
            amount: {
              type: Type.NUMBER,
              description: "Monto en números positivos (sin signo ni símbolo de moneda)",
            },
            currency: {
              type: Type.STRING,
              description: "Moneda: ARS, USD, etc. Por defecto ARS si no se especifica",
            },
            category_name: {
              type: Type.STRING,
              description: "Categoría del gasto/ingreso. Ej: 'Comida y bebida', 'Transporte', 'Sueldo'",
            },
            account_name: {
              type: Type.STRING,
              description: "Nombre de la cuenta o billetera. Ej: 'Efectivo', 'Mercado Pago', 'Banco'.",
            },
            description: {
              type: Type.STRING,
              description: "Descripción breve del gasto/ingreso",
            },
            date: {
              type: Type.STRING,
              description: "Fecha en formato YYYY-MM-DD. Si dice 'hoy', 'ayer', etc., calcular la fecha correcta.",
            },
          },
          required: ["type", "amount", "category_name"],
        },
      },
      {
        name: "create_installment",
        description: "Registra una compra en cuotas.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "Descripción del producto o compra",
            },
            total_amount: {
              type: Type.NUMBER,
              description: "Monto total de la compra",
            },
            total_installments: {
              type: Type.NUMBER,
              description: "Número total de cuotas",
            },
            has_interest: {
              type: Type.BOOLEAN,
              description: "¿Tiene interés? Si dice 'sin interés', es false",
            },
            interest_rate: {
              type: Type.NUMBER,
              description: "Tasa de interés mensual en porcentaje (solo si has_interest es true)",
            },
            account_name: {
              type: Type.STRING,
              description: "Cuenta con la que se paga",
            },
            category_name: {
              type: Type.STRING,
              description: "Categoría del producto",
            },
            due_day: {
              type: Type.NUMBER,
              description: "Día del mes en que vence la cuota. Default 10",
            },
            currency: {
              type: Type.STRING,
              description: "Moneda. Por defecto ARS",
            },
          },
          required: ["description", "total_amount", "total_installments", "has_interest"],
        },
      },
      {
        name: "create_savings_goal",
        description: "Crea una meta de ahorro o ítem de wishlist.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Nombre de la meta o producto",
            },
            type: {
              type: Type.STRING,
              enum: ["goal", "wishlist"],
              description: "¿Es una meta de ahorro (goal) o una wishlist?",
            },
            target_amount: {
              type: Type.NUMBER,
              description: "Monto objetivo",
            },
            target_date: {
              type: Type.STRING,
              description: "Fecha objetivo en YYYY-MM-DD (opcional)",
            },
            monthly_contribution: {
              type: Type.NUMBER,
              description: "Cuánto puede ahorrar por mes (opcional)",
            },
            product_url: {
              type: Type.STRING,
              description: "URL del producto (solo para wishlist, opcional)",
            },
            currency: {
              type: Type.STRING,
              description: "Moneda. Por defecto ARS",
            },
          },
          required: ["name", "type", "target_amount"],
        },
      },
      {
        name: "get_financial_summary",
        description: "Obtiene un resumen del estado financiero actual del usuario.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "get_upcoming_installments",
        description: "Obtiene las cuotas que vencen en los próximos meses.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            months: {
              type: Type.NUMBER,
              description: "Cantidad de meses a proyectar. Default 3",
            },
          },
        },
      },
      {
        name: "get_spending_analysis",
        description: "Analiza los patrones de gasto del usuario.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            period_days: {
              type: Type.NUMBER,
              description: "Período de análisis en días. Default 30",
            },
            category_name: {
              type: Type.STRING,
              description: "Filtrar por categoría (opcional)",
            },
          },
        },
      },
      {
        name: "transfer_between_accounts",
        description: "Registra una transferencia de dinero entre dos cuentas del usuario.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            from_account: {
              type: Type.STRING,
              description: "Cuenta de origen",
            },
            to_account: {
              type: Type.STRING,
              description: "Cuenta de destino",
            },
            amount: {
              type: Type.NUMBER,
              description: "Monto a transferir",
            },
            currency: {
              type: Type.STRING,
              description: "Moneda. Por defecto ARS",
            },
            description: {
              type: Type.STRING,
              description: "Descripción de la transferencia (opcional)",
            },
          },
          required: ["from_account", "to_account", "amount"],
        },
      },
      {
        name: "distribute_income",
        description:
          "Distribuye un ingreso o sueldo recibido hacia metas de ahorro, fondos de reserva o pagos fijos, actualizando las metas en la base de datos.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            income_amount: {
              type: Type.NUMBER,
              description: "Monto total del ingreso recibido",
            },
            allocations: {
              type: Type.ARRAY,
              description: "Lista de asignaciones monetarias hacia cada meta o reserva",
              items: {
                type: Type.OBJECT,
                properties: {
                  goal_name: {
                    type: Type.STRING,
                    description: "Nombre de la meta de ahorro receptora",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Monto de dinero a destinar",
                  },
                  percentage: {
                    type: Type.NUMBER,
                    description: "Porcentaje del ingreso total",
                  },
                },
                required: ["goal_name", "amount"],
              },
            },
            notes: {
              type: Type.STRING,
              description: "Explicación de la estrategia de distribución aplicada (ej. Regla 50/30/20)",
            },
          },
          required: ["income_amount", "allocations"],
        },
      },
    ],
  },
];
