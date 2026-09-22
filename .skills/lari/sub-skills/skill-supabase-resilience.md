# Lari Sub-Skill: Supabase Resilience & Data Sync

## Principios Inquebrantables

### 1. Caché y Data Fetching (Next.js App Router)
* **Peticiones GET Vivas**: Por defecto, Next.js cachea fuertemente las API Routes GET. Si el endpoint consume Supabase y sirve datos en tiempo real, SIEMPRE añade `export const dynamic = "force-dynamic";` al inicio del archivo `route.ts`.
* NUNCA confíes en un `router.refresh()` si la API Route está siendo cacheada agresivamente a nivel de servidor sin revalidación explícita.

### 2. Mutaciones Atómicas (Race Conditions)
* Al realizar sumatorias u operaciones críticas dependientes de saldos anteriores (ej. ajustar balance), utiliza funciones RPC (Remote Procedure Call) en Supabase para delegar la atomicidad a la base de datos de Postgres. 
* Si se lee y luego se escribe desde Next.js Serverless (ej. Lambda), asume que múltiples lambdas podrían ejecutarse concurrentemente y causar race conditions.

### 3. Sincronización y Sesiones
* La sesión en Supabase y las cookies locales (Next.js Middleware) deben viajar en paralelo. Si Supabase devuelve un token/sesión nueva tras un OTP o SignIn, inyecta las cookies `finance_session` de inmediato para evitar redirecciones rebotadas.
* El `localStorage` debe usarse EXCLUSIVAMENTE como caché de fallback para modo Offline/Demo o para hidratar estados pre-loading, NUNCA como fuente de verdad por encima de Supabase si la conectividad está activa.
