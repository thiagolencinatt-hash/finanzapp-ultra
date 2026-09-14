-- ==============================================================================
-- FINANZAPP ULTRA - ESQUEMA COMPLETO POSTGRESQL PARA SUPABASE
-- Ejecutar en el SQL Editor de tu proyecto en Supabase (mknagmpmsimkdupncpds)
-- ==============================================================================

-- 1. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  salary NUMERIC DEFAULT 800000,
  currency TEXT DEFAULT 'ARS',
  pay_day INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CUENTAS Y BILLETERAS
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'digital_wallet', 'cash', 'crypto', 'other')),
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  color TEXT DEFAULT '#10B981',
  icon TEXT DEFAULT 'Wallet',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT 'Tag',
  color TEXT DEFAULT '#6366F1',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE TRANSACCIONES (INGRESOS, GASTOS, TRANSFERENCIAS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE COMPRAS EN CUOTAS (TARJETAS DE CREDITO + FASE 4 INTERESES)
CREATE TABLE IF NOT EXISTS public.installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  paid_installments INTEGER NOT NULL DEFAULT 0 CHECK (paid_installments <= total_installments),
  installment_amount NUMERIC NOT NULL,
  interest_rate NUMERIC DEFAULT 0,
  interest_type TEXT DEFAULT 'none' CHECK (interest_type IN ('none', 'fixed_percentage', 'cft', 'tna')),
  first_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE METAS DE AHORRO
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  color TEXT DEFAULT '#10B981',
  icon TEXT DEFAULT 'Target',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE PRESUPUESTOS Y LIMITES MENSUALES
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit > 0),
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id, period)
);

-- 8. TABLA DE SUSCRIPCIONES Y PAGOS RECURRENTES
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  billing_day INTEGER DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 31),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA DE HISTORIAL DE CHAT DEL ASISTENTE IA
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - AISLAMIENTO TOTAL POR USUARIO
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para profiles
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas universales para las tablas vinculadas por user_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['accounts', 'categories', 'transactions', 'installments', 'goals', 'budgets', 'subscriptions', 'chat_messages']
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Users can manage own %1$s" ON public.%1$s;
      CREATE POLICY "Users can manage own %1$s" ON public.%1$s
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ', tbl);
  END LOOP;
END $$;

-- ==============================================================================
-- TRIGGERS Y FUNCIONES AUTOMATICAS
-- ==============================================================================

-- Trigger: Crea automáticamente el perfil y categorías por defecto al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Insertar perfil
  INSERT INTO public.profiles (id, email, name, salary, currency, pay_day)
  VALUES (NEW.id, NEW.email, v_name, 800000, 'ARS', 5)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Insertar cuenta inicial por defecto
  INSERT INTO public.accounts (user_id, name, type, balance, currency, color, icon)
  VALUES (NEW.id, 'Billetera Principal', 'digital_wallet', 0, 'ARS', '#10B981', 'Wallet');

  -- Insertar categorías estándar
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Sueldo Principal', 'income', 'Briefcase', '#10B981', TRUE),
    (NEW.id, 'Trabajos Freelance / Extra', 'income', 'Laptop', '#3B82F6', TRUE),
    (NEW.id, 'Rendimientos e Inversiones', 'income', 'TrendingUp', '#F59E0B', TRUE),
    (NEW.id, 'Supermercado y Alimentos', 'expense', 'ShoppingCart', '#6366F1', TRUE),
    (NEW.id, 'Servicios e Impuestos', 'expense', 'Home', '#F97316', TRUE),
    (NEW.id, 'Salidas y Restaurantes', 'expense', 'Coffee', '#EC4899', TRUE),
    (NEW.id, 'Transporte y Nafta', 'expense', 'Car', '#3B82F6', TRUE),
    (NEW.id, 'Salud y Gimnasio', 'expense', 'Activity', '#14B8A6', TRUE),
    (NEW.id, 'Entretenimiento y Suscripciones', 'expense', 'Tv', '#8B5CF6', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enlazar trigger a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
