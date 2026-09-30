-- Create auth_attempts table to record login and signup attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL, -- 'success', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ip_blacklist table to store blocked IP addresses
CREATE TABLE IF NOT EXISTS public.ip_blacklist (
    ip TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means permanent block
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;

-- Auth Attempts policy: Admin full access
DROP POLICY IF EXISTS "Allow admin full access to auth_attempts" ON public.auth_attempts;
CREATE POLICY "Allow admin full access to auth_attempts" ON public.auth_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- IP Blacklist policy: Admin full access
DROP POLICY IF EXISTS "Allow admin full access to ip_blacklist" ON public.ip_blacklist;
CREATE POLICY "Allow admin full access to ip_blacklist" ON public.ip_blacklist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- IP Blacklist policy: Public read access (for Next.js Middleware IP checks using Anon Key)
DROP POLICY IF EXISTS "Allow public read access to ip_blacklist" ON public.ip_blacklist;
CREATE POLICY "Allow public read access to ip_blacklist" ON public.ip_blacklist
    FOR SELECT USING (true);
