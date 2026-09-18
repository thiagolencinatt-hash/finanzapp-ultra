"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Mail,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();

  // Estados del flujo: "email" -> "otp" -> "password-setup"
  const [step, setStep] = useState<"email" | "otp" | "password-setup">("email");
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");

  // Campos de formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP (6 dígitos)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Estados de carga y feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Temporizador para reenvío de OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Si ya tiene sesión activa en Supabase, redirigir automáticamente al dashboard
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        document.cookie = "finance_session=active; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = `finance_user_email=${encodeURIComponent(session.user.email || "")}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `finance_user_id=${encodeURIComponent(session.user.id)}; path=/; max-age=31536000; SameSite=Lax`;
        router.push("/");
      }
    });
  }, [router]);

  // 1. ENVIAR CODIGO OTP CON RESEND
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Por favor, ingresá un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al despachar el código OTP.");
      }

      setStep("otp");
      setCountdown(60);
      setSuccess(`¡Código de 6 dígitos enviado a ${cleanEmail}! Revisá tu bandeja de entrada.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar el código.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. VERIFICAR CODIGO OTP (6 DÍGITOS)
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const token = otpDigits.join("").trim();
    if (token.length !== 6) {
      setError("Ingresá el código completo de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Verificar contra nuestro endpoint seguro
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, token }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback: Si Supabase tenía una verificación previa
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            const { data: supaData, error: supaErr } = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token,
              type: "email",
            });
            if (supaErr || !supaData?.user) {
              throw new Error(data.error || "Código inválido o expirado.");
            }
            data.user = {
              id: supaData.user.id,
              email: supaData.user.email,
              name: supaData.user.user_metadata?.name || cleanEmail.split("@")[0],
            };
          } catch {
            throw new Error(data.error || "Código inválido o expirado.");
          }
        } else {
          throw new Error(data.error || "Código inválido o expirado.");
        }
      }

      if (data?.user) {
        // Persistir cookies y localStorage de sesión
        document.cookie = "finance_session=active; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = `finance_user_email=${encodeURIComponent(data.user.email || cleanEmail)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `finance_user_id=${encodeURIComponent(data.user.id || `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`)}; path=/; max-age=31536000; SameSite=Lax`;
        if (data.user.name) {
          document.cookie = `finance_user_name=${encodeURIComponent(data.user.name)}; path=/; max-age=31536000; SameSite=Lax`;
        }
        localStorage.setItem("finanzapp_user_profile", JSON.stringify(data.user));

        setSuccess("¡Código verificado con éxito!");
        setStep("password-setup");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido o expirado.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. ESTABLECER CONTRASEÑA ADICIONAL (O ENTRAR DIRECTO)
  const handleSetPasswordAndEnter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (newPassword) {
      if (newPassword.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }

      setIsLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        // Guardar contraseña en el backend
        const res = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: newPassword }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al guardar contraseña.");
        }

        // Si Supabase client está configurado, intentar sincronizar usuario
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            await supabase.auth.updateUser({ password: newPassword });
          } catch {
            // silent fallback
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar contraseña.";
        setError(msg);
        setIsLoading(false);
        return;
      }
    }

    // Redirigir a la app
    router.push("/");
  };

  // 4. INGRESO DIRECTO CON CONTRASEÑA
  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Completá tu correo y contraseña.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback con Supabase si está disponible
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (supaErr || !supaData?.user) {
            throw new Error(data.error || "Credenciales inválidas.");
          }
          data.user = {
            id: supaData.user.id,
            email: supaData.user.email,
            name: supaData.user.user_metadata?.name || cleanEmail.split("@")[0],
          };
        } else {
          throw new Error(data.error || "Credenciales inválidas.");
        }
      }

      if (data?.user) {
        document.cookie = "finance_session=active; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = `finance_user_email=${encodeURIComponent(data.user.email || cleanEmail)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `finance_user_id=${encodeURIComponent(data.user.id || `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`)}; path=/; max-age=31536000; SameSite=Lax`;
        if (data.user.name) {
          document.cookie = `finance_user_name=${encodeURIComponent(data.user.name)}; path=/; max-age=31536000; SameSite=Lax`;
        }
        localStorage.setItem("finanzapp_user_profile", JSON.stringify(data.user));

        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          } catch {
            // silent fallback
          }
        }

        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Credenciales inválidas.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejadores del teclado para los 6 inputs del OTP
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    if (clean.length > 1) {
      // Manejo de pegado (paste) de código completo
      const pasted = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-100">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Logo / Encabezado */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <TrendingUp className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              FinanzApp <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">Ultra</span>
            </h1>
            <p className="text-xs text-slate-400">Control inteligente de finanzas personales</p>
          </div>
        </div>

        {/* Tarjeta de Autenticación */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-3xl p-6 sm:p-8">
          
          {/* PASO 1: INGRESO DE EMAIL O CONTRASEÑA */}
          {step === "email" && (
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-white">Iniciar Sesión / Registro</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresá tu correo para recibir tu código seguro OTP de 6 dígitos.
                </p>
              </div>

              {/* Selector de modo: Código OTP vs Contraseña */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => { setAuthMode("otp"); setError(null); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === "otp"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Código OTP (Email)
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("password"); setError(null); }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === "password"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Con Contraseña
                </button>
              </div>

              {authMode === "otp" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Enviar Código de 6 Dígitos</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginWithPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contraseña registrada"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Ingresar a mi Cuenta</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* PASO 2: VERIFICACION DE LOS 6 DIGITOS OTP */}
          {step === "otp" && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Ingresá el código de 6 dígitos</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enviado a <span className="text-emerald-400 font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 Casillas individuales de OTP */}
                <div className="flex justify-between gap-2 sm:gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpDigits.join("").length !== 6}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verificar Código</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(null); }}
                    className="hover:text-slate-200"
                  >
                    ← Cambiar correo
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0 || isLoading}
                    onClick={() => handleSendOtp()}
                    className="text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {countdown > 0 ? `Reenviar en ${countdown}s` : "Reenviar código"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PASO 3: CONFIGURAR CONTRASEÑA ADICIONAL */}
          {step === "password-setup" && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Seguridad Adicional</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Establecé una contraseña para ingresar más rápido en tus próximos inicios de sesión.
                </p>
              </div>

              <form onSubmit={handleSetPasswordAndEnter} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repetí la contraseña"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Guardar Contraseña y Entrar</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Continuar sin contraseña por ahora
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Alertas de Error y Éxito */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Footer de Seguridad y PWA */}
        <div className="text-center mt-6 text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Sesiones cifradas y sincronizadas en la nube con Supabase
          </p>
          <p>Instalable como app nativa en tu celular (PWA)</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
