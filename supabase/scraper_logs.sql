-- Create scraper_logs table to record automatic and manual crawling status
CREATE TABLE IF NOT EXISTS public.scraper_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'skipped', 'already_up_to_date', 'not_released_yet'
    message TEXT,
    target_month TEXT,
    emails_sent INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access
DROP POLICY IF EXISTS "Allow admin full access to scraper_logs" ON public.scraper_logs;
CREATE POLICY "Allow admin full access to scraper_logs" ON public.scraper_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
