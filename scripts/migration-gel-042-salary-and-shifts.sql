-- ==============================================================================
-- GEL-042: MIGRACIÓN SUPABASE - MI SUELDO & MIS HORARIOS LABORALES
-- ==============================================================================

-- 1. Tabla: Registros de Sueldo y Recibos
CREATE TABLE IF NOT EXISTS public.salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    period TEXT NOT NULL,
    net_salary NUMERIC NOT NULL DEFAULT 0,
    gross_salary NUMERIC,
    total_hours NUMERIC NOT NULL DEFAULT 160,
    hourly_rate_normal NUMERIC NOT NULL DEFAULT 0,
    hourly_rate_night NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla: Turnos de Trabajo y Horarios
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    day_name TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    total_hours NUMERIC NOT NULL DEFAULT 0,
    night_hours NUMERIC NOT NULL DEFAULT 0,
    coworkers_overlap JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_rest_day BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_salary_records_user ON public.salary_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_date ON public.work_shifts(user_id, shift_date ASC);

-- 4. Seguridad a nivel de fila (RLS)
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

-- Políticas públicas y autenticadas permisivas para funcionamiento dual
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'salary_records' AND policyname = 'salary_records_all_access'
    ) THEN
        CREATE POLICY "salary_records_all_access" ON public.salary_records FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'work_shifts' AND policyname = 'work_shifts_all_access'
    ) THEN
        CREATE POLICY "work_shifts_all_access" ON public.work_shifts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
