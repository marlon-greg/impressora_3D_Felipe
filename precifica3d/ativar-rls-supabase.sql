-- ═══════════════════════════════════════════════════════════════
-- Precifica3D — fechar a API pública do Supabase
--
-- O Supabase expõe todas as tabelas do schema `public` numa API REST
-- acessível com a chave publishable, que é pública. Sem RLS, qualquer
-- um que soubesse a URL do projeto leria e escreveria tudo.
--
-- Ligando RLS SEM criar nenhuma policy, a API nega todo acesso. O app
-- não é afetado: ele fala Postgres direto, como usuário dono das
-- tabelas, e dono passa por cima de RLS.
--
-- Cole no SQL Editor e execute uma vez.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  tabela text;
BEGIN
  FOR tabela IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);
    RAISE NOTICE 'RLS ligado em %', tabela;
  END LOOP;
END $$;

-- Confere o resultado: rowsecurity deve ser true em todas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
