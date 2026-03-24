-- =============================================
-- Migration: Garantir que closers têm todas as permissões necessárias
-- Problema: Closers não conseguem marcar chamado, salvar dados, gerar formulários,
-- registrar vendas, etc. Políticas RLS podem estar faltando no banco.
-- =============================================

-- =============================================
-- 1. PARTICIPANTS - Closer precisa SELECT e UPDATE
-- =============================================
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin vê todos
DROP POLICY IF EXISTS "Admins can view all participants" ON public.participants;
CREATE POLICY "Admins can view all participants"
    ON public.participants FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- SELECT: Closer vê apenas os atribuídos a ele
DROP POLICY IF EXISTS "Closers can view assigned participants" ON public.participants;
CREATE POLICY "Closers can view assigned participants"
    ON public.participants FOR SELECT
    USING (assigned_closer_id = auth.uid());

-- UPDATE: Admin pode atualizar todos
DROP POLICY IF EXISTS "Admins can update participants" ON public.participants;
CREATE POLICY "Admins can update participants"
    ON public.participants FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- UPDATE: Closer pode atualizar os atribuídos a ele (marcar chamado, salvar dados, checkin, etc.)
DROP POLICY IF EXISTS "Closers can update assigned participants" ON public.participants;
CREATE POLICY "Closers can update assigned participants"
    ON public.participants FOR UPDATE
    USING (assigned_closer_id = auth.uid())
    WITH CHECK (assigned_closer_id = auth.uid());

-- INSERT: Admin pode inserir
DROP POLICY IF EXISTS "Admins can insert participants" ON public.participants;
CREATE POLICY "Admins can insert participants"
    ON public.participants FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- DELETE: Admin pode deletar
DROP POLICY IF EXISTS "Admins can delete participants" ON public.participants;
CREATE POLICY "Admins can delete participants"
    ON public.participants FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- 2. SALES - Closer precisa SELECT e INSERT
-- =============================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin vê todas
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
CREATE POLICY "Admins can view all sales"
    ON public.sales FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- SELECT: Closer vê suas vendas
DROP POLICY IF EXISTS "Closers can view their own sales" ON public.sales;
CREATE POLICY "Closers can view their own sales"
    ON public.sales FOR SELECT
    USING (closer_id = auth.uid());

-- INSERT: Qualquer autenticado pode inserir vendas
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
CREATE POLICY "Authenticated users can insert sales"
    ON public.sales FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Admin pode atualizar vendas
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
CREATE POLICY "Admins can update sales"
    ON public.sales FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- UPDATE: Closer pode atualizar suas vendas
DROP POLICY IF EXISTS "Closers can update their own sales" ON public.sales;
CREATE POLICY "Closers can update their own sales"
    ON public.sales FOR UPDATE
    USING (closer_id = auth.uid());

-- =============================================
-- 3. DISC_FORMS - Closer precisa SELECT, INSERT (já corrigido, mas garantindo)
-- =============================================
ALTER TABLE public.disc_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view disc_forms" ON public.disc_forms;
CREATE POLICY "Authenticated users can view disc_forms"
    ON public.disc_forms FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Anonymous users can view disc_forms" ON public.disc_forms;
CREATE POLICY "Anonymous users can view disc_forms"
    ON public.disc_forms FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert disc_forms" ON public.disc_forms;
CREATE POLICY "Authenticated users can insert disc_forms"
    ON public.disc_forms FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can insert disc_forms" ON public.disc_forms;
CREATE POLICY "Anonymous users can insert disc_forms"
    ON public.disc_forms FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update disc_forms" ON public.disc_forms;
CREATE POLICY "Anyone can update disc_forms"
    ON public.disc_forms FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================
-- 4. FORMS (tabela legacy) - Mesmas permissões
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms' AND table_schema = 'public') THEN
        ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Authenticated users can view forms" ON public.forms;
        CREATE POLICY "Authenticated users can view forms"
            ON public.forms FOR SELECT
            USING (auth.uid() IS NOT NULL);

        DROP POLICY IF EXISTS "Public can view forms by URL" ON public.forms;
        CREATE POLICY "Public can view forms by URL"
            ON public.forms FOR SELECT
            USING (true);

        DROP POLICY IF EXISTS "Authenticated users can insert forms" ON public.forms;
        CREATE POLICY "Authenticated users can insert forms"
            ON public.forms FOR INSERT
            WITH CHECK (auth.uid() IS NOT NULL);

        DROP POLICY IF EXISTS "Authenticated users can update forms" ON public.forms;
        CREATE POLICY "Authenticated users can update forms"
            ON public.forms FOR UPDATE
            USING (auth.uid() IS NOT NULL);

        DROP POLICY IF EXISTS "Public can update forms" ON public.forms;
        CREATE POLICY "Public can update forms"
            ON public.forms FOR UPDATE
            USING (true);
    END IF;
END $$;

-- =============================================
-- 5. USERS - Closer precisa ler lista de closers
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
CREATE POLICY "Authenticated users can view users"
    ON public.users FOR SELECT
    USING (auth.uid() IS NOT NULL);
