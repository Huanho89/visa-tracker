-- ==========================================
-- FIX: Infinite recursion in RLS policies
-- Root cause: Admin policies on profiles table were querying
-- profiles table recursively, causing infinite recursion.
-- Solution: Use SECURITY DEFINER function that bypasses RLS.
-- ==========================================

-- Step 1: Create a safe SECURITY DEFINER function to check admin
-- SECURITY DEFINER = runs as the function owner (bypasses RLS), not the caller
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop and recreate admin policy on profiles (was causing recursion)
DROP POLICY IF EXISTS "Allow admin full access to profiles" ON public.profiles;
CREATE POLICY "Allow admin full access to profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

-- Step 3: Update admin policies on other tables to use the safe function too
DROP POLICY IF EXISTS "Allow admin full access to cases" ON public.cases;
CREATE POLICY "Allow admin full access to cases" ON public.cases
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin full access to bulletins" ON public.bulletins;
CREATE POLICY "Allow admin full access to bulletins" ON public.bulletins
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin full access to articles" ON public.articles;
CREATE POLICY "Allow admin full access to articles" ON public.articles
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin full access to drip queues" ON public.drip_queues;
CREATE POLICY "Allow admin full access to drip queues" ON public.drip_queues
    FOR ALL USING (public.is_admin());
