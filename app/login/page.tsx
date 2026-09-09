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
  Lock,
  Eye,
  EyeOff,
  X,
  BrainCircuit,
  Info,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  // Mode: "input" (forms) | "otp" (6-digit verification)
  const [step, setStep] = useState<"input" | "otp">("input");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // Floating spam notification banner
  const [showSpamBanner, setShowSpamBanner] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [salary, setSalary] = useState("980000");

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP inputs (6 individual digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      const handleUserSession = (sessionUser: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      }) => {
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `finance_session=active; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `finance_demo_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
        const profileName =
          (sessionUser.user_metadata?.name as string) ||
          sessionUser.email?.split("@")[0] ||
          "Usuario";
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

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
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

  // Login directo con Contraseña
  async function handleLoginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }
    if (!password) {
      setError("Por favor ingresa tu contraseña");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Credenciales incorrectas");
      }

      // Guardar perfil en localStorage
      const userProfile = data.user || {
        name: email.split("@")[0] || "Usuario",
        email,
        currency: "ARS",
        salary: 980000,
      };
      localStorage.setItem("finanzapp_user_profile", JSON.stringify(userProfile));

      setSuccess("¡Bienvenido de nuevo! Ingresando al panel...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  }

  // Enviar Código de Verificación (para registrarse o para login OTP)
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }

    if (activeTab === "register") {
      if (!password || password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
      }
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
          password: activeTab === "register" ? password : undefined,
          currency,
          salary: Number(salary) || 980000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar el código");
      }

      setStep("otp");
      setCountdown(30); // 30s cooldown before resend
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccess(`¡Código enviado a ${email}! Revisa tu buzón o carpeta de Spam.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar código");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OTP digit input with auto-advance & backspace
  const handleOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when 6 digits completed
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      verifyCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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

      const userProfile = data.user || {
        name: name || email.split("@")[0] || "Usuario",
        email,
        currency,
        salary: Number(salary) || 980000,
      };
      localStorage.setItem("finanzapp_user_profile", JSON.stringify(userProfile));

      setSuccess("¡Código verificado con éxito! Cuenta guardada.");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Código de verificación no válido");
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        backgroundColor: "#03060c",
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 65%),
          radial-gradient(circle at 10% 90%, rgba(30, 41, 59, 0.5) 0%, transparent 50%),
          radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 45%)
        `,
      }}
    >
      {/* Dynamic Floating Spam Reminder Notification (with X close button) */}
      {showSpamBanner && (
        <div className="fixed top-4 left-4 right-4 max-w-xl mx-auto z-50 animate-slide-up">
          <div
            className="flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-2xl transition-all shadow-[0_15px_40px_rgba(0,0,0,0.8)]"
            style={{
              backgroundColor: "rgba(10, 15, 26, 0.88)",
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Info className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left leading-tight">
                <div className="font-extrabold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                  <span>Recordatorio de Código por Correo</span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
                  Si solicitas un código de verificación, <strong className="text-amber-300">revisa tu carpeta de Spam / Correo no deseado</strong> en tu casilla de email si no lo ves en tu bandeja principal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSpamBanner(false)}
              className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border border-white/10 active:scale-95"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Glassmorphic 3D Card Container */}
      <div className="w-full max-w-md relative z-10 my-8 animate-slide-up">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-[0_10px_30px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] border-t border-emerald-300/40 border-b-4 border-emerald-800"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            }}
          >
            <TrendingUp className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gradient">
            FinanzApp Ultra
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-400">
            Control de gastos, cuotas y finanzas personales pro
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Zap className="w-3 h-3" /> Dólar en Vivo
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <BrainCircuit className="w-3 h-3 text-emerald-400" /> Asistente IA
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Cifrado 100% Privado
            </span>
          </div>
        </div>

        {/* 3D Glassmorphic Auth Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 border backdrop-blur-3xl transition-all duration-300 relative shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
          style={{
            backgroundColor: "rgba(10, 15, 26, 0.78)",
            borderColor: "rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* ================= STEP 1: INPUT FORMS ================= */}
          {step === "input" && (
            <>
              {/* 3D Demo Button (Acceso Rápido en 1 Clic) */}
              <button
                onClick={handleDemoAccess}
                disabled={isLoading}
                type="button"
                className="w-full mb-5 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-between gap-2 cursor-pointer relative overflow-hidden group border-t border-emerald-200/50 border-b-[4px] border-emerald-900 shadow-[0_6px_0_#064e3b,0_12px_25px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:border-b-0 active:shadow-[0_1px_0_#064e3b]"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#000",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center">
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
                <div className="flex-grow border-t border-zinc-800" />
                <span className="flex-shrink mx-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  o usar tu cuenta permanente
                </span>
                <div className="flex-grow border-t border-zinc-800" />
              </div>

              {/* 3D Tabs: Iniciar Sesión / Crear Cuenta */}
              <div
                className="grid grid-cols-2 rounded-2xl p-1 mb-5 border border-zinc-800 shadow-inner"
                style={{ backgroundColor: "rgba(18, 24, 38, 0.6)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setError(null);
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === "login"
                      ? "text-black bg-gradient-to-b from-emerald-400 to-emerald-500 border-t border-emerald-200/40 border-b-2 border-emerald-800 shadow-[0_3px_0_#064e3b,0_5px_15px_rgba(16,185,129,0.3)]"
                      : "text-zinc-400 hover:text-zinc-200"
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
                  className={`py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 cursor-pointer ${
                    activeTab === "register"
                      ? "text-black bg-gradient-to-b from-emerald-400 to-emerald-500 border-t border-emerald-200/40 border-b-2 border-emerald-800 shadow-[0_3px_0_#064e3b,0_5px_15px_rgba(16,185,129,0.3)]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              {/* Sub-selector para Iniciar Sesión: Contraseña vs Código */}
              {activeTab === "login" && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("password");
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      loginMethod === "password"
                        ? "bg-zinc-800 text-zinc-100 border-zinc-600 shadow-[0_2px_0_#000]"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    🔒 Con Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("otp");
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      loginMethod === "otp"
                        ? "bg-zinc-800 text-zinc-100 border-zinc-600 shadow-[0_2px_0_#000]"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                  >
                    ✉️ Con Código al Correo
                  </button>
                </div>
              )}

              {/* Formulario 1: Iniciar Sesión con Contraseña */}
              {activeTab === "login" && loginMethod === "password" && (
                <form onSubmit={handleLoginWithPassword} className="space-y-4 animate-slide-up">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contraseña secreta"
                        required
                        className="w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error alert */}
                  {error && (
                    <div className="rounded-xl p-3 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 animate-slide-up">
                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 3D Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-black border-t border-emerald-200/50 border-b-[4px] border-emerald-900 shadow-[0_6px_0_#064e3b,0_12px_25px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:border-b-0 active:shadow-[0_1px_0_#064e3b] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-5"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Iniciando sesión...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-black stroke-[2.5]" />
                        <span>Entrar con Contraseña</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Formulario 2: Iniciar Sesión con Código OTP al Correo */}
              {activeTab === "login" && loginMethod === "otp" && (
                <form onSubmit={handleSendCode} className="space-y-4 animate-slide-up">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Te enviaremos un código de seguridad de 6 dígitos a tu bandeja o carpeta de spam.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-xl p-3 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 animate-slide-up">
                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-black border-t border-emerald-200/50 border-b-[4px] border-emerald-900 shadow-[0_6px_0_#064e3b,0_12px_25px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:border-b-0 active:shadow-[0_1px_0_#064e3b] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-5"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Despachando código...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 text-black stroke-[2.5]" />
                        <span>Enviar Código de 6 Dígitos</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Formulario 3: Crear Cuenta con Contraseña Permanente */}
              {activeTab === "register" && (
                <form onSubmit={handleSendCode} className="space-y-3.5 animate-slide-up">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-200">Tu Nombre o Apodo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. Thiago"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-200">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-200">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mín. 6 letras"
                          required
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-200">Repetir Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite tu clave"
                          required
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/70 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Currency & Salary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-200">Moneda</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all cursor-pointer border border-zinc-800 bg-black/60 text-zinc-100 shadow-inner"
                      >
                        <option value="ARS">ARS ($) Pesos</option>
                        <option value="USD">USD ($) Dólares</option>
                        <option value="EUR">EUR (€) Euros</option>
                        <option value="USDT">USDT (Cripto)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-200">Sueldo Estimado</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="number"
                          value={salary}
                          onChange={(e) => setSalary(e.target.value)}
                          placeholder="980000"
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all border border-zinc-800 bg-black/60 text-zinc-100 shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl p-3 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 animate-slide-up">
                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-black border-t border-emerald-200/50 border-b-[4px] border-emerald-900 shadow-[0_6px_0_#064e3b,0_12px_25px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:border-b-0 active:shadow-[0_1px_0_#064e3b] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Enviando código de validación...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                        <span>Crear Cuenta y Validar Correo</span>
                      </>
                    )}
                  </button>
                </form>
              )}
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
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver / Cambiar correo</span>
              </button>

              {/* OTP Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Mail className="w-6 h-6 animate-bounce" style={{ animationDuration: "2s" }} />
                </div>
                <h3 className="text-lg font-extrabold text-zinc-100">
                  Ingresa tu Código de 6 Dígitos
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enviado a <span className="font-bold text-emerald-400">{email}</span>
                </p>
                <p className="text-[11px] text-amber-400/90 font-medium mt-1">
                  (Si no lo ves en la bandeja principal, recuerda revisar tu carpeta de Spam)
                </p>
              </div>

              {/* 6 OTP Input Boxes (3D Glassmorphic blocks) */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-3" onPaste={handlePaste}>
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
                    className="w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl sm:text-3xl font-black rounded-2xl outline-none transition-all duration-200 border-2 shadow-inner border-t border-white/10"
                    style={{
                      backgroundColor: digit ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 0, 0, 0.65)",
                      borderColor: digit ? "rgba(16, 185, 129, 0.8)" : "rgba(63, 63, 70, 0.8)",
                      color: digit ? "#34d399" : "#ffffff",
                      boxShadow: digit
                        ? "0 0 20px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(0,0,0,0.6)"
                        : "inset 0 2px 5px rgba(0,0,0,0.7)",
                    }}
                  />
                ))}
              </div>

              {/* Error / Success alerts */}
              {error && (
                <div className="rounded-xl p-3 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-2 animate-slide-up">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="rounded-xl p-3 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2 animate-slide-up">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Verify 3D Button */}
              <button
                type="button"
                onClick={() => verifyCode()}
                disabled={isLoading || otpDigits.join("").length < 6}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-black border-t border-emerald-200/50 border-b-[4px] border-emerald-900 shadow-[0_6px_0_#064e3b,0_12px_25px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:border-b-0 active:shadow-[0_1px_0_#064e3b] transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
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
                  <p className="text-xs text-zinc-400 font-medium">
                    Reenviar nuevo código en <span className="font-bold text-emerald-400">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>¿No recibiste el correo? Solicitar un nuevo código</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Privacy badge */}
          <div className="mt-6 text-center border-t border-zinc-800/80 pt-4">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cuentas protegidas con cifrado y persistencia local segura</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] mt-4 text-zinc-600">
          FinanzApp Ultra © 2026 • Control total y privado de tus finanzas
        </p>
      </div>
    </div>
  );
}
