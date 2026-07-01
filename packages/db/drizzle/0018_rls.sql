-- ============================================================================
-- Row-Level Security (RLS): isolamento por núcleo imposto pelo banco.
-- A API conecta como papel de aplicação `pdv_app` (sujeito a RLS).
-- Contexto por requisição: SET app.nucleo_id = '<uuid>'  (só aquele núcleo)
--                          SET app.bypass    = 'on'      (gestor/webhook/agendador)
-- Migrações e scripts conectam como superusuário → ignoram RLS automaticamente.
-- ============================================================================

-- Papel de aplicação (não-superusuário). Senha padrão só p/ dev — troque em produção:
--   ALTER ROLE pdv_app PASSWORD '<forte>';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pdv_app') THEN
    CREATE ROLE pdv_app LOGIN PASSWORD 'pdv_app';
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO pdv_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pdv_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pdv_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pdv_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pdv_app;--> statement-breakpoint

-- Tabelas com nucleo_id → política direta.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contas','produtos','categorias','expedientes','caixa_movimentos','vendas',
    'lancamentos','cobrancas','devolucoes','cortes','estoque_movimentos','asaas_customers'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (current_setting(''app.bypass'', true) = ''on'' OR nucleo_id::text = current_setting(''app.nucleo_id'', true)) '
      'WITH CHECK (current_setting(''app.bypass'', true) = ''on'' OR nucleo_id::text = current_setting(''app.nucleo_id'', true))',
      t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Tabelas-filhas (sem nucleo_id) → política via existência do pai (que já é filtrado por RLS).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('venda_itens','vendas','venda_id'),
    ('pagamentos','vendas','venda_id'),
    ('corte_itens','cortes','corte_id'),
    ('conta_membros','contas','conta_id')
  ) AS x(child, parent, fk)
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.child);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.child);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', r.child);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (current_setting(''app.bypass'', true) = ''on'' OR EXISTS (SELECT 1 FROM %I p WHERE p.id = %I.%I)) '
      'WITH CHECK (current_setting(''app.bypass'', true) = ''on'' OR EXISTS (SELECT 1 FROM %I p WHERE p.id = %I.%I))',
      r.child, r.parent, r.child, r.fk, r.parent, r.child, r.fk);
  END LOOP;
END
$$;
