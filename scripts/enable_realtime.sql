-- ============================================================
-- FinanzApp Ultra — Habilitar Supabase Realtime
-- ============================================================
-- INSTRUCCIONES:
--   1. Abrí el panel de tu proyecto en https://supabase.com/dashboard
--   2. Navegá a "SQL Editor" (menú lateral)
--   3. Pegá todo este script y ejecutá "Run"
--   4. Verificá que no haya errores
--
-- NOTA: Si alguna tabla ya está en la publicación, el ALTER
-- devolverá un aviso (no un error). Es seguro re-ejecutar.
-- ============================================================

-- ─── 1. Agregar tablas a la publicación de Realtime ─────────────
-- Supabase escucha cambios en PostgreSQL vía la publicación
-- `supabase_realtime`. Si las tablas NO están agregadas, los
-- eventos INSERT/UPDATE/DELETE nunca llegan al WebSocket.

DO $$
BEGIN
  -- Transactions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    RAISE NOTICE 'OK: transactions agregada a supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'SKIP: transactions ya estaba en supabase_realtime';
  END;

  -- Accounts
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
    RAISE NOTICE 'OK: accounts agregada a supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'SKIP: accounts ya estaba en supabase_realtime';
  END;

  -- Category Budgets
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.category_budgets;
    RAISE NOTICE 'OK: category_budgets agregada a supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'SKIP: category_budgets ya estaba en supabase_realtime';
  END;

  -- Savings Goals
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_goals;
    RAISE NOTICE 'OK: savings_goals agregada a supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'SKIP: savings_goals ya estaba en supabase_realtime';
  END;

  -- Installments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.installments;
    RAISE NOTICE 'OK: installments agregada a supabase_realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'SKIP: installments ya estaba en supabase_realtime';
  END;
END
$$;

-- ─── 2. Configurar REPLICA IDENTITY FULL ────────────────────────
-- Por defecto PostgreSQL solo envía la clave primaria en eventos
-- DELETE. Con REPLICA IDENTITY FULL, el payload del WebSocket
-- incluye TODOS los campos de la fila eliminada, permitiendo
-- al SyncEngine saber exactamente qué transacción se borró
-- y actualizar el localStorage local correctamente.

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.category_budgets REPLICA IDENTITY FULL;
ALTER TABLE public.savings_goals REPLICA IDENTITY FULL;
ALTER TABLE public.installments REPLICA IDENTITY FULL;

-- ─── 3. Verificación ────────────────────────────────────────────
-- Ejecuta esta query para confirmar que las tablas están publicadas:
--
--   SELECT * FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime';
--
-- Deberías ver: transactions, accounts, category_budgets,
-- savings_goals, installments.
-- ============================================================
