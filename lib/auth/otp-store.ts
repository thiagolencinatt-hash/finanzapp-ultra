import nodemailer from "nodemailer";

interface OtpEntry {
  code: string;
  email: string;
  name?: string;
  password?: string;
  currency?: string;
  salary?: number;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

// In-memory store globalmente accesible en tiempo de ejecución
const globalOtpStore = new Map<string, OtpEntry>();

// Limpiar códigos expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of globalOtpStore.entries()) {
    if (value.expiresAt < now) {
      globalOtpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function generateAndSendOtp({
  email,
  name,
  password,
  currency,
  salary,
}: {
  email: string;
  name?: string;
  password?: string;
  currency?: string;
  salary?: number;
}) {
  const normalizedEmail = email.trim().toLowerCase();

  // Generar código numérico dinámico de 6 dígitos (ej: 482910)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // Válido por 10 minutos

  globalOtpStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    password,
    currency: currency || "ARS",
    salary: salary || 980000,
    createdAt: now,
    expiresAt,
    attempts: 0,
  });

  console.log(`\n======================================================`);
  console.log(`🔐 [FinanzApp Ultra] CÓDIGO DE VERIFICACIÓN DINÁMICO`);
  console.log(`📧 Destinatario: ${normalizedEmail}`);
  console.log(`🔢 Código OTP de 6 dígitos: >>> ${code} <<<`);
  console.log(`⏱️ Válido por: 10 minutos`);
  console.log(`======================================================\n`);

  let emailSentReal = false;
  let emailError: string | null = null;

  // 1. Intentar envío con RESEND si existe RESEND_API_KEY
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "FinanzApp Ultra <onboarding@resend.dev>",
          to: [normalizedEmail],
          subject: `${code} es tu código de verificación para FinanzApp Ultra`,
          html: getEmailHtml(code, name || normalizedEmail.split("@")[0]),
        }),
      });
      if (res.ok) {
        emailSentReal = true;
      } else {
        const errJson = await res.json();
        emailError = errJson.message || "Error al enviar con Resend";
      }
    } catch (e: unknown) {
      emailError = e instanceof Error ? e.message : "Error de red en Resend";
    }
  }

  // 2. Intentar envío con SMTP si existe SMTP_HOST y SMTP_USER
  if (!emailSentReal && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"FinanzApp Ultra" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: `${code} es tu código de verificación para FinanzApp Ultra`,
        html: getEmailHtml(code, name || normalizedEmail.split("@")[0]),
      });
      emailSentReal = true;
    } catch (e: unknown) {
      emailError = e instanceof Error ? e.message : "Error al conectar con servidor SMTP";
    }
  }

  return {
    success: true,
    email: normalizedEmail,
    code, // Se incluye para feedback interactivo y visual en la app
    emailSentReal,
    emailError,
    expiresInSeconds: 600,
  };
}

export function verifyOtp(email: string, inputCode: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = globalOtpStore.get(normalizedEmail);

  if (!entry) {
    return {
      valid: false,
      message: "No hay ningún código pendiente para este correo o ya expiró. Solicita uno nuevo.",
    };
  }

  if (Date.now() > entry.expiresAt) {
    globalOtpStore.delete(normalizedEmail);
    return {
      valid: false,
      message: "El código ha expirado (más de 10 minutos). Solicita un nuevo código.",
    };
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    globalOtpStore.delete(normalizedEmail);
    return {
      valid: false,
      message: "Demasiados intentos incorrectos. Por seguridad solicita un nuevo código.",
    };
  }

  if (entry.code.trim() !== inputCode.trim()) {
    return {
      valid: false,
      message: `Código incorrecto. Te quedan ${5 - entry.attempts} intentos.`,
    };
  }

  // Código correcto -> eliminar del store (uso único)
  globalOtpStore.delete(normalizedEmail);

  return {
    valid: true,
    user: {
      name: entry.name,
      email: entry.email,
      password: entry.password,
      currency: entry.currency,
      salary: entry.salary,
    },
  };
}

function getEmailHtml(code: string, name: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.5px;">FinanzApp Ultra</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: rgba(0,0,0,0.8);">Verificación de Seguridad</p>
      </div>
      <div style="padding: 36px 28px;">
        <h2 style="font-size: 18px; margin-top: 0; color: #f8fafc;">¡Hola ${name}! 👋</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
          Usa el siguiente código de seguridad de 6 dígitos para verificar tu cuenta y completar tu inicio de sesión:
        </p>
        <div style="background: #1e293b; border-radius: 14px; padding: 20px; text-align: center; border: 1px solid #334155; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #10b981; font-family: monospace;">
            ${code}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Válido durante los próximos 10 minutos</p>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
          Si tú no solicitaste este código, puedes ignorar este mensaje de forma segura. Tus fondos y datos continúan protegidos con cifrado privado.
        </p>
      </div>
      <div style="padding: 16px 24px; background: #090d16; text-align: center; border-top: 1px solid #1e293b;">
        <p style="margin: 0; font-size: 11px; color: #475569;">FinanzApp Ultra • Control Inteligente de Finanzas Personales</p>
      </div>
    </div>
  `;
}
