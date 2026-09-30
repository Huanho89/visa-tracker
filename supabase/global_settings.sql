-- Create global_settings table to store dynamic configurations (like email)
CREATE TABLE IF NOT EXISTS public.global_settings (
    id TEXT PRIMARY KEY, -- e.g., 'email_config'
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Enable Policies for Admins
CREATE POLICY "Allow admin full access to global_settings" ON public.global_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
