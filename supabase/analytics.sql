-- ====================================================
-- ANALYTICS SCHEMA - Visa Auto Tracking Web Analytics
-- ====================================================

-- 1. Create analytics_logs table
CREATE TABLE IF NOT EXISTS public.analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    referrer TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    country TEXT DEFAULT 'Unknown',
    city TEXT DEFAULT 'Unknown',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index on created_at for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_analytics_logs_created_at 
    ON public.analytics_logs(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Allow anyone (guests/public) to insert analytics data
CREATE POLICY "Allow public insert to analytics_logs" ON public.analytics_logs
    FOR INSERT WITH CHECK (true);

-- 5. RLS Policy: Only admins can view/query analytics logs
CREATE POLICY "Allow admin read analytics_logs" ON public.analytics_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
