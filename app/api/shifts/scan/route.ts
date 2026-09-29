export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/get-user";
import { getGenAI, GEMINI_FALLBACK_MODELS } from "@/lib/gemini/client";
import { calculateNightHours, calculateShiftDuration } from "@/lib/utils/payroll-calculator";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetEmployee = (formData.get("targetEmployee") as string) || (formData.get("employeeName") as string) || user.name || "";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ninguna imagen o documento de la planilla de turnos." },
        { status: 400 }
      );
    }

    const fileName = (file.name || "").toLowerCase();
    const mimeType = (file.type || "").toLowerCase();
    const isPdf = fileName.endsWith(".pdf") || mimeType === "application/pdf";
    const isImage =
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp") ||
      mimeType.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Formato no compatible. Por favor sube una foto o PDF de la planilla de horarios." },
        { status: 400 }
      );
    }

    const resolvedMime = isPdf
      ? "application/pdf"
      : mimeType || (fileName.endsWith(".png") ? "image/png" : "image/jpeg");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const prompt = `Eres un extractor de turnos laborales y organizador de personal experto.
Analiza esta planilla de horarios, foto de pizarra, cuadrante semanal o documento impreso.
${targetEmployee ? `El usuario busca los horarios de: "${targetEmployee}". Si está presente en la planilla, prioriza extraer su cronograma.` : "Identifica al trabajador principal o extrae los turnos del primer empleado individual, listando todos los empleados detectados."}

Tareas indispensables:
1. Detecta la lista de todos los nombres de empleados/compañeros presentes en la planilla.
2. Identifica la semana completa (Lunes a Domingo):
   - Horarios de trabajo habituales.
   - ¡MUY IMPORTANTE!: Identifica explícitamente el día de "Franco", "Libre", "Descanso", "F" o casillero vacío del trabajador. Si un día no trabaja o tiene franco semanal, márcalo con "isRestDay": true, "startTime": "Franco", "endTime": "Franco", "totalHours": 0, "nightHours": 0.
3. Para cada día de la semana o fecha asignada al empleado objetivo:
   - "date": Fecha en formato "YYYY-MM-DD" si figura mes/año, o proyectada según el día.
   - "dayName": Nombre del día en español (ej: "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo").
   - "startTime": Hora de inicio del turno en formato "HH:MM" (o "Franco" si es día libre).
   - "endTime": Hora de finalización del turno en formato "HH:MM" (o "Franco" si es día libre).
   - "totalHours": Horas totales de duración del turno (0 si es franco).
   - "nightHours": Horas nocturnas comprendidas entre las 21:00 y las 06:00 (0 si es franco).
   - "isRestDay": Booleano (true si es franco/descanso semanal, false si es laborable).
   - "coworkers": Array de compañeros que trabajan ese mismo día en horarios que se superpongan o compartan franja horaria:
     * "name": Nombre del compañero.
     * "overlapHours": Cantidad de horas exactas que coinciden en el turno.
     * "theirShift": Horario de ese compañero (ej: "18:00 - 02:00").

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura:
{
  "detectedEmployees": ["Nombre 1", "Nombre 2", "Nombre 3"],
  "selectedEmployee": "Nombre del empleado cuyos turnos se detallan abajo",
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Lunes",
      "startTime": "14:00",
      "endTime": "22:00",
      "totalHours": 8,
      "nightHours": 1,
      "isRestDay": false,
      "coworkers": [
        { "name": "Martín", "overlapHours": 4, "theirShift": "18:00 - 02:00" },
        { "name": "Sofía", "overlapHours": 8, "theirShift": "14:00 - 22:00" }
      ]
    },
    {
      "date": "YYYY-MM-DD",
      "dayName": "Domingo",
      "startTime": "Franco",
      "endTime": "Franco",
      "totalHours": 0,
      "nightHours": 0,
      "isRestDay": true,
      "coworkers": []
    }
  ]
}

Reglas estrictas:
- Devuelve ÚNICAMENTE el JSON sin formato markdown, sin explicaciones ni bloques de código.`;

    const ai = getGenAI();
    let responseText = "";
    let lastError: any = null;

    for (const modelName of GEMINI_FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: resolvedMime,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[shifts/scan] Model ${modelName} falló:`, err?.message || err);
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "No se pudo procesar la planilla de turnos con IA. " + (lastError?.message || "Prueba con una foto más nítida o centrada.") },
        { status: 502 }
      );
    }

    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "La IA no pudo interpretar la cuadrícula de horarios. Asegúrate de que las columnas y nombres sean legibles." },
        { status: 422 }
      );
    }

    const rawShifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];
    if (rawShifts.length === 0) {
      return NextResponse.json(
        { error: "No se detectaron turnos laborales legibles en esta imagen o documento." },
        { status: 422 }
      );
    }

    // Normalizar y auditar horas, francos y nocturnidad con la lógica matemática exacta
    const today = new Date();
    const WEEK_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const formattedShifts = rawShifts.map((s: any, idx: number) => {
      const rawStart = String(s.startTime || s.start_time || "09:00").trim();
      const rawEnd = String(s.endTime || s.end_time || "17:00").trim();
      const rawDayName = s.dayName || s.day_name || "Día";
      const notes = s.notes || "";

      const isRest = 
        Boolean(s.isRestDay || s.is_rest_day) ||
        rawStart.toLowerCase().includes("franco") ||
        rawStart.toLowerCase().includes("libre") ||
        rawStart.toLowerCase().includes("descanso") ||
        rawEnd.toLowerCase().includes("franco") ||
        notes.toLowerCase().includes("franco");

      const startTime = isRest ? "Franco" : rawStart;
      const endTime = isRest ? "Franco" : rawEnd;
      const totalHours = isRest ? 0 : (Number(s.totalHours || s.total_hours) || calculateShiftDuration(startTime, endTime));
      const nightHours = isRest ? 0 : (Number(s.nightHours || s.night_hours) || calculateNightHours(startTime, endTime));

      // Si no hay fecha YYYY-MM-DD completa, asignar fecha secuencial a partir de hoy
      let shiftDate = s.date || s.shift_date;
      if (!shiftDate || !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
        const d = new Date(today);
        d.setDate(today.getDate() + idx);
        shiftDate = d.toISOString().split("T")[0];
      }

      const coworkers = Array.isArray(s.coworkers)
        ? s.coworkers.map((c: any) => ({
            name: c.name || "Compañero",
            overlap_hours: Number(c.overlapHours || c.overlap_hours || 0),
            their_shift: c.theirShift || c.their_shift || "",
          }))
        : [];

      return {
        shift_date: shiftDate,
        day_name: rawDayName,
        start_time: startTime,
        end_time: endTime,
        total_hours: totalHours,
        night_hours: nightHours,
        is_rest_day: isRest,
        coworkers_overlap: coworkers,
        notes: isRest ? "Franco semanal (Día de descanso)" : (notes || null),
      };
    });

    // GEL-043: Si la planilla tiene 6 días laborables y ningún franco, inferir y agregar el día restante como Franco
    const hasAnyRestDay = formattedShifts.some((s: any) => s.is_rest_day);
    if (!hasAnyRestDay && formattedShifts.length === 6) {
      const normalizeDay = (d: string) => d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const presentDays = new Set(formattedShifts.map((s: any) => normalizeDay(s.day_name)));
      const missingDay = WEEK_DAYS.find((d) => !presentDays.has(normalizeDay(d)));

      if (missingDay) {
        // Encontrar fecha adecuada o agregar un día después del último
        const lastShiftDate = formattedShifts[formattedShifts.length - 1].shift_date;
        const nextDate = new Date(lastShiftDate);
        nextDate.setDate(nextDate.getDate() + 1);

        formattedShifts.push({
          shift_date: nextDate.toISOString().split("T")[0],
          day_name: missingDay,
          start_time: "Franco",
          end_time: "Franco",
          total_hours: 0,
          night_hours: 0,
          is_rest_day: true,
          coworkers_overlap: [],
          notes: "Franco semanal (Día de descanso)",
        });
      }
    }

    return NextResponse.json({
      success: true,
      detectedEmployees: Array.isArray(parsed.detectedEmployees) ? parsed.detectedEmployees : [],
      selectedEmployee: parsed.selectedEmployee || targetEmployee,
      shifts: formattedShifts,
      count: formattedShifts.length,
    });
  } catch (error: any) {
    console.error("[POST /api/shifts/scan] Error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar planilla de horarios: " + (error?.message || error) },
      { status: 500 }
    );
  }
}
