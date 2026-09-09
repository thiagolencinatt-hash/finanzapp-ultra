"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Mail,
  Loader2,
  Sparkles,
  User,
  DollarSign,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  Copy,
  Check,
  Inbox,
  BrainCircuit,
  Lock,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  // Mode: "input" (email & info) | "otp" (6-digit code verification)
  const [step, setStep] = useState<"input" | "otp">("input");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [salary, setSalary] = useState("980000");

  // OTP inputs (6 individual digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receivedCodePreview, setReceivedCodePreview] = useState<string | null>(null);
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Resend countdown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Escuchar si el usuario llegó tras hacer clic en un enlace de acceso en su correo
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = createClient();

      const handleUserSession = (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `finance_session=active; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `finance_demo_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
        const profileName = (sessionUser.user_metadata?.name as string) || sessionUser.email?.split("@")[0] || "Usuario";
        document.cookie = `finance_user_name=${encodeURIComponent(profileName)}; path=/; max-age=${maxAge}; SameSite=Lax`;

        localStorage.setItem(
          "finanzapp_user_profile",
          JSON.stringify({
            name: profileName,
            email: sessionUser.email,
            currency: sessionUser.user_metadata?.currency || "ARS",
            salary: sessionUser.user_metadata?.salary || 980000,
            loggedInAt: new Date().toISOString(),
          })
        );

        setSuccess("¡Enlace verificado con éxito! Ingresando al panel...");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 500);
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          handleUserSession(session.user);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
          handleUserSession(session.user);
        }
      });

      return () => subscription.unsubscribe();
    } catch (e) {
      console.warn("Supabase listener error:", e);
    }
  }, [router]);

  // Focus first input box when switching to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Quick 1-Click Demo Login
  const handleDemoAccess = () => {
    setIsLoading(true);
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `finance_session=active; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `finance_demo_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `finance_user_name=${encodeURIComponent("Thiago")}; path=/; max-age=${maxAge}; SameSite=Lax`;

    localStorage.setItem(
      "finanzapp_user_profile",
      JSON.stringify({
        name: "Thiago",
        email: "thiago.demo@finanzapp.com",
        currency: "ARS",
        salary: 980000,
        loggedInAt: new Date().toISOString(),
      })
    );

    setSuccess("¡Bienvenido! Accediendo al panel interactivo...");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 600);
  };

  // Step 1: Send OTP Code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || email.split("@")[0],
          currency,
          salary: Number(salary) || 980000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar el código");
      }

      setReceivedCodePreview(data.code);
      setIsRealEmailSent(data.emailSentReal);
      setStep("otp");
      setCountdown(30); // 30s cooldown before resend
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccess(
        data.emailSentReal
          ? `¡Código enviado a tu bandeja de correo ${email}!`
          : `Código de seguridad generado con éxito.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar código");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OTP digit input with auto-advance & backspace
  const handleOtpChange = (index: number, value: string) => {
    // Only allow single numeric character
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError(null);

    // If character entered, focus next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits completed, auto-verify
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      verifyCode(fullCode);
    }
  };

  // Handle Key Down (Backspace to jump backwards)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste of complete 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(newDigits);

    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    } else {
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // Step 2: Verify Code
  async function verifyCode(codeToVerify?: string) {
    const code = codeToVerify || otpDigits.join("");
    if (code.length < 6) {
      setError("Por favor ingresa los 6 dígitos del código");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código incorrecto o expirado");
      }

      // Guardar perfil en localStorage
      const userProfile = data.user || {
        name: name || email.split("@")[0] || "Usuario",
        email,
        currency,
        salary: Number(salary) || 980000,
      };
      localStorage.setItem("finanzapp_user_profile", JSON.stringify(userProfile));

      setSuccess("¡Código verificado con éxito! Iniciando sesión...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Código de verificación no válido");
      setIsLoading(false);
    }
  }

  // Auto-fill code helper
  const fillCodeHelper = (code: string) => {
    const chars = code.split("").slice(0, 6);
    setOtpDigits(chars);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    verifyCode(code);
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: "radial-gradient(circle at 50% 15%, hsl(var(--card) / 0.85) 0%, hsl(var(--background)) 100%)",
      }}
    >
      {/* Background ambient glowing spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-36 -left-36 w-[450px] h-[450px] rounded-full opacity-20 blur-[100px] animate-pulse"
          style={{ background: "hsl(var(--primary))" }}
        />
        <div
          className="absolute -bottom-36 -right-36 w-[450px] h-[450px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "hsl(160 84% 39%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full opacity-5 blur-[140px]"
          style={{ background: "hsl(var(--primary))" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 my-8 animate-slide-up">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 gradient-primary shadow-2xl shadow-primary/30 ring-4 ring-primary/20">
            <TrendingUp className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gradient">
            FinanzApp Ultra
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
            Autenticación segura y verificación por código dinámico
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-3 h-3" /> Dólar en Vivo
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <BrainCircuit className="w-3 h-3" /> Asistente IA
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-3 h-3" /> Verificación OTP
            </span>
          </div>
        </div>

        {/* Auth Main Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 shadow-2xl border backdrop-blur-2xl transition-all duration-300 relative"
          style={{
            background: "hsl(var(--card) / 0.88)",
            borderColor: "hsl(var(--border) / 0.8)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* ================= STEP 1: EMAIL & DETAILS ================= */}
          {step === "input" && (
            <>
              {/* 1-Click Instant Demo Access */}
              <button
                onClick={handleDemoAccess}
                disabled={isLoading}
                type="button"
                className="w-full mb-5 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-between gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-[0.98] group"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(160 84% 39%))",
                  color: "#000",
                  boxShadow: "0 8px 25px hsl(var(--primary) / 0.25)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-black animate-spin" style={{ animationDuration: "6s" }} />
                  </div>
                  <div className="text-left leading-tight">
                    <div className="font-extrabold text-black">⚡ Acceso Inmediato (1 Clic)</div>
                    <div className="text-[10px] font-semibold text-black/75">Entra directamente sin esperar código</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative flex py-1.5 items-center mb-5">
                <div className="flex-grow border-t" style={{ borderColor: "hsl(var(--border))" }} />
                <span
                  className="flex-shrink mx-3 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  o verificar con tu correo
                </span>
                <div className="flex-grow border-t" style={{ borderColor: "hsl(var(--border))" }} />
              </div>

              {/* Tabs: Iniciar Sesión / Crear Cuenta */}
              <div
                className="grid grid-cols-2 rounded-2xl p-1 mb-5 border"
                style={{
                  background: "hsl(var(--muted) / 0.6)",
                  borderColor: "hsl(var(--border) / 0.6)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setError(null);
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === "login"
                      ? "gradient-primary text-black shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setError(null);
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === "register"
                      ? "gradient-primary text-black shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                {/* If Register: Name & Currency */}
                {activeTab === "register" && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Tu Nombre o Apodo</label>
                      <div className="relative">
                        <User
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ej. Thiago"
                          required={activeTab === "register"}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-primary/40"
                          style={{
                            background: "hsl(var(--input))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Moneda</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all cursor-pointer"
                          style={{
                            background: "hsl(var(--input))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          <option value="ARS">ARS ($) Pesos</option>
                          <option value="USD">USD ($) Dólares</option>
                          <option value="EUR">EUR (€) Euros</option>
                          <option value="USDT">USDT (Cripto)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Sueldo Estimado</label>
                        <div className="relative">
                          <DollarSign
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          />
                          <input
                            type="number"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            placeholder="980000"
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all"
                            style={{
                              background: "hsl(var(--input))",
                              border: "1px solid hsl(var(--border))",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Correo Electrónico</label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu.correo@ejemplo.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-primary/40 font-medium"
                      style={{
                        background: "hsl(var(--input))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Te enviaremos un código de seguridad de 6 dígitos para validar tu acceso.
                  </p>
                </div>

                {/* Error alert */}
                {error && (
                  <div className="rounded-xl p-3 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2 animate-slide-up">
                    <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl font-black text-sm text-black gradient-primary shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Generando código dinámico...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>Enviar Código de Verificación</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ================= STEP 2: 6-DIGIT OTP VERIFICATION ================= */}
          {step === "otp" && (
            <div className="space-y-5 animate-slide-up">
              {/* Back to email button */}
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setError(null);
                  setSuccess(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cambiar correo</span>
              </button>

              {/* OTP Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 bg-primary/10 border border-primary/20 text-primary">
                  <Mail className="w-6 h-6 animate-bounce" style={{ animationDuration: "2s" }} />
                </div>
                <h3 className="text-lg font-extrabold text-foreground">
                  Ingresa tu Código de 6 Dígitos
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enviado a <span className="font-bold text-foreground">{email}</span>
                </p>
              </div>

              {/* Live Simulated / Real Dispatch Notification Box */}
              {receivedCodePreview && (
                <div
                  className="rounded-2xl p-3.5 border bg-primary/5 border-primary/30 relative overflow-hidden animate-slide-up"
                  style={{
                    boxShadow: "0 4px 20px hsl(var(--primary) / 0.15)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-primary animate-pulse" />
                      <span className="text-[11px] font-bold text-primary">
                        {isRealEmailSent ? "📧 Correo despachado & Código" : "📧 Código de 6 Dígitos Generado"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fillCodeHelper(receivedCodePreview)}
                      className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg gradient-primary text-black flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      {copiedCode ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                      <span>{copiedCode ? "¡Aplicado!" : "⚡ Autocompletar (6 dígitos)"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Código de 6 dígitos:</span>
                      <span className="text-[10px] text-muted-foreground/70">Ingresa este código o el de tu correo</span>
                    </div>
                    <span className="font-mono font-black text-lg text-primary tracking-[0.25em]">
                      {receivedCodePreview}
                    </span>
                  </div>
                </div>
              )}

              {/* 6 OTP Input Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-2" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl outline-none transition-all duration-200 border focus:ring-2 focus:ring-primary focus:border-primary shadow-inner"
                    style={{
                      background: digit ? "hsl(var(--primary) / 0.15)" : "hsl(var(--input))",
                      borderColor: digit ? "hsl(var(--primary) / 0.7)" : "hsl(var(--border))",
                      color: digit ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                    }}
                  />
                ))}
              </div>

              {/* Error / Success alerts */}
              {error && (
                <div className="rounded-xl p-3 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2 animate-slide-up">
                  <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="rounded-xl p-3 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2 animate-slide-up">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => verifyCode()}
                disabled={isLoading || otpDigits.join("").length < 6}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black gradient-primary shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Verificando código...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar e Ingresar</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>

              {/* Resend Code Button & Countdown */}
              <div className="text-center pt-2">
                {countdown > 0 ? (
                  <p className="text-xs text-muted-foreground font-medium">
                    Reenviar nuevo código en <span className="font-bold text-primary">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>¿No recibiste el código? Solicitar uno nuevo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Privacy badge */}
          <div className="mt-6 text-center border-t pt-4" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
            <div
              className="inline-flex items-center gap-1.5 text-[11px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cifrado de extremo a extremo & Protección de datos</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] mt-4" style={{ color: "hsl(var(--muted-foreground))" }}>
          FinanzApp Ultra © 2026 • Control total y privado de tus finanzas
        </p>
      </div>
    </div>
  );
}
