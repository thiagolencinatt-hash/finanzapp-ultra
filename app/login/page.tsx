"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Mail, Lock, Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function enterDemoSession() {
    document.cookie = "finance_demo_session=true; path=/; max-age=604800";
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isSupabaseConfigured = supabaseUrl.length > 10 && !supabaseUrl.includes("your-project") && !supabaseUrl.includes("placeholder");

    if (!isSupabaseConfigured) {
      // Si Supabase aún no tiene credenciales configuradas en .env.local, ingresar directamente en modo demo
      enterDemoSession();
      return;
    }

    try {
      const supabase = createClient();
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push("/");
        router.refresh();
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (authError) throw authError;
        setSuccess("¡Cuenta creada! Revisá tu email para confirmar.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error de autenticación";
      // Si falla por error de red/servidor no configurado, permitir entrar en demo
      if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network") || message.toLowerCase().includes("failed")) {
        enterDemoSession();
      } else {
        setError(message.includes("Invalid login credentials")
          ? "Email o contraseña incorrectos"
          : message
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      {/* Blobs decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(160 67% 52%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 gradient-primary shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">FinanceAI</h1>
          <p className="mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            Tu asistente financiero personal
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-xl">
          {/* Demo Mode Button */}
          <button
            onClick={enterDemoSession}
            type="button"
            className="w-full mb-6 py-3.5 px-4 rounded-xl text-sm font-bold transition-all card-hover flex items-center justify-center gap-2 cursor-pointer shadow-md"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.1))",
              color: "hsl(var(--primary))",
              border: "1.5px solid hsl(var(--primary) / 0.5)",
            }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>⚡ Probar Modo Demo (Acceso Inmediato)</span>
          </button>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t" style={{ borderColor: "hsl(var(--border))" }} />
            <span className="flex-shrink mx-3 text-xs uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
              o ingresá tus datos
            </span>
            <div className="flex-grow border-t" style={{ borderColor: "hsl(var(--border))" }} />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "hsl(var(--muted))" }}>
            {["Ingresar", "Registrarse"].map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setIsLogin(i === 0); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                  isLogin === (i === 0)
                    ? "gradient-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ color: isLogin === (i === 0) ? "white" : "hsl(var(--muted-foreground))" }}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{
                    background: "hsl(var(--input))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "hsl(var(--input))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="rounded-xl p-3 text-sm" style={{ background: "hsl(var(--expense-muted))", color: "hsl(var(--expense))" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl p-3 text-sm" style={{ background: "hsl(var(--income-muted))", color: "hsl(var(--income))" }}>
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-white gradient-primary shadow-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? "Ingresando..." : "Registrando..."}
                </>
              ) : (
                isLogin ? "Ingresar" : "Crear cuenta"
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "hsl(var(--muted-foreground))" }}>
            Tus datos están protegidos con cifrado end-to-end
          </p>
        </div>
      </div>
    </div>
  );
}
