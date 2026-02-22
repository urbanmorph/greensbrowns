-- Add license photo path to drivers and make phone mandatory

-- 1. Add license_photo_path column
ALTER TABLE public.drivers
  ADD COLUMN license_photo_path TEXT;

-- 2. Backfill existing NULL phones with empty string so we can add NOT NULL
UPDATE public.drivers SET phone = '' WHERE phone IS NULL;

-- 3. Make phone NOT NULL
ALTER TABLE public.drivers
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN phone SET DEFAULT '';
