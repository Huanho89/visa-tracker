-- ==========================================
-- SCHEMA SQL - US Visa Tracker App
-- ==========================================

-- 1. Profiles Table (linked to Supabase Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'inactive' (soft-deactivate)
    allow_multiple_cases BOOLEAN NOT NULL DEFAULT false,
    enable_drip_emails BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Cases Table (Visa cases tracked by users)
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- F1, F2A, F2B, F3, F4, etc.
    chargeability TEXT NOT NULL DEFAULT 'All Areas',
    priority_date DATE NOT NULL,
    nvc_case TEXT,
    invoice_id TEXT,
    consulate TEXT DEFAULT 'Ho Chi Minh City, Vietnam',
    petitioner TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- 3. Bulletins Table (Visa Bulletin history)
CREATE TABLE IF NOT EXISTS public.bulletins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month TEXT NOT NULL, -- e.g., '07/2026'
    category TEXT NOT NULL, -- F1, F2A, F2B, F3, F4
    chargeability TEXT NOT NULL DEFAULT 'All Areas',
    final_action_date DATE NOT NULL,
    filing_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for bulletins
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

-- 4. Articles Table (Guide Articles)
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL, -- Markdown or HTML content
    drip_day INTEGER, -- 0 for Day 0, 7 for Day 7, etc. NULL for normal blog posts.
    seo_description TEXT, -- Custom SEO meta description
    seo_keyword TEXT, -- Custom SEO focus keyword
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 5. Drip Queues Table (Time-based drip campaign queues)
CREATE TABLE IF NOT EXISTS public.drip_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for drip_queues
ALTER TABLE public.drip_queues ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Profiles policies
CREATE POLICY "Allow users to read their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow admin full access to profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Cases policies
CREATE POLICY "Allow users to read their own cases" ON public.cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own cases" ON public.cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own cases" ON public.cases
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own cases" ON public.cases
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow admin full access to cases" ON public.cases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Bulletins policies (read-only for public, admin for all)
CREATE POLICY "Allow public read access to bulletins" ON public.bulletins
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to bulletins" ON public.bulletins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Articles policies (read-only for public, admin for all)
CREATE POLICY "Allow public read access to articles" ON public.articles
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to articles" ON public.articles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Drip queues policies
CREATE POLICY "Allow users to read their own drip queues" ON public.drip_queues
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow admin full access to drip queues" ON public.drip_queues
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Trigger to automatically create a profile for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, allow_multiple_cases, enable_drip_emails)
    VALUES (new.id, new.email, 'user', false, true);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MIGRATION: 2026-06-25 - Add status column to profiles table
-- RUN THIS IN SUPABASE SQL EDITOR:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- MIGRATION: 2026-06-25 - Add SEO columns to articles table
-- RUN THIS IN SUPABASE SQL EDITOR:
-- ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_description TEXT;
-- ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_keyword TEXT;


