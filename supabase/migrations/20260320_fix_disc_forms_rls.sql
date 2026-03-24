-- =============================================
-- Migration: Fix disc_forms RLS policies
-- Problem: Closers cannot see or create DISC forms because
-- the disc_forms table only has an UPDATE policy (for anonymous form filling).
-- Missing SELECT and INSERT policies cause forms to be invisible to closers.
-- =============================================

-- Enable RLS on disc_forms if not already enabled
ALTER TABLE public.disc_forms ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow any authenticated user to view disc_forms
-- (closers need to see forms they generated for their assigned participants)
DROP POLICY IF EXISTS "Authenticated users can view disc_forms" ON public.disc_forms;
CREATE POLICY "Authenticated users can view disc_forms"
    ON public.disc_forms FOR SELECT
    TO authenticated
    USING (true);

-- SELECT: Allow anonymous users to view disc_forms (for public form filling page)
DROP POLICY IF EXISTS "Anonymous users can view disc_forms" ON public.disc_forms;
CREATE POLICY "Anonymous users can view disc_forms"
    ON public.disc_forms FOR SELECT
    TO anon
    USING (true);

-- INSERT: Allow any authenticated user to create disc_forms
-- (both admins and closers generate forms for participants)
DROP POLICY IF EXISTS "Authenticated users can insert disc_forms" ON public.disc_forms;
CREATE POLICY "Authenticated users can insert disc_forms"
    ON public.disc_forms FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- INSERT: Allow anonymous insert (for form submissions from public page)
DROP POLICY IF EXISTS "Anonymous users can insert disc_forms" ON public.disc_forms;
CREATE POLICY "Anonymous users can insert disc_forms"
    ON public.disc_forms FOR INSERT
    TO anon
    WITH CHECK (true);

-- Ensure the existing UPDATE policy covers both anon and authenticated
DROP POLICY IF EXISTS "Anyone can update disc_forms" ON public.disc_forms;
CREATE POLICY "Anyone can update disc_forms"
    ON public.disc_forms FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Only admins can delete disc_forms
DROP POLICY IF EXISTS "Admins can delete disc_forms" ON public.disc_forms;
CREATE POLICY "Admins can delete disc_forms"
    ON public.disc_forms FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );
