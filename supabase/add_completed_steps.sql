-- Add completed_steps column to cases table
-- This stores an array of step indices (0-8) that the user has manually marked as completed
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb;
