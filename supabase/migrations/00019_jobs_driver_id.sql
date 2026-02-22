-- Add driver_id to jobs so the admin can assign a specific driver
ALTER TABLE public.jobs
  ADD COLUMN driver_id UUID REFERENCES public.drivers(id);
