-- Add license validity date to drivers
ALTER TABLE public.drivers
  ADD COLUMN license_valid_till DATE;
