ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
