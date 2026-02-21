-- Migration: drivers table, vehicle_drivers junction, rename owner_id → created_by
-- Restructures vehicle-driver associations: vehicles are admin-managed,
-- drivers are standalone (not app users), many-to-many via junction table.

BEGIN;

-- 1. Create drivers table (standalone, no FK to profiles/auth)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS for drivers
CREATE POLICY "Admins can manage drivers"
  ON public.drivers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Create vehicle_drivers junction table
CREATE TABLE IF NOT EXISTS public.vehicle_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(vehicle_id, driver_id)
);

CREATE INDEX idx_vehicle_drivers_vehicle ON public.vehicle_drivers(vehicle_id);
CREATE INDEX idx_vehicle_drivers_driver ON public.vehicle_drivers(driver_id);

ALTER TABLE public.vehicle_drivers ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS for vehicle_drivers
CREATE POLICY "Admins can manage vehicle_drivers"
  ON public.vehicle_drivers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Rename vehicles.owner_id → created_by
--    Drop old FK (was ON DELETE CASCADE — dangerous), make nullable, re-add with SET NULL
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey;
ALTER TABLE public.vehicles RENAME COLUMN owner_id TO created_by;
ALTER TABLE public.vehicles ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Drop stale RLS policies referencing owner_id
DROP POLICY IF EXISTS "Collectors can view own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Collectors can view own vehicle documents" ON public.vehicle_documents;
DROP POLICY IF EXISTS "Collector read own vehicle docs" ON storage.objects;

-- 5. Seed test data
INSERT INTO public.drivers (name, license_number, phone) VALUES
  ('Rajan Kumar', 'KA0120210012345', '+919876543210'),
  ('Mohammed Saleem', 'KA0520190054321', '+919876543211');

INSERT INTO public.vehicles (registration_number, vehicle_type, capacity_kg)
VALUES
  ('KA01AB1234', 'auto', 400),
  ('KA05MH9876', 'mini_truck', 1000)
ON CONFLICT (registration_number) DO NOTHING;

-- Assign both drivers to first vehicle, one to second
INSERT INTO public.vehicle_drivers (vehicle_id, driver_id)
SELECT v.id, d.id
FROM public.vehicles v, public.drivers d
WHERE v.registration_number = 'KA01AB1234';

INSERT INTO public.vehicle_drivers (vehicle_id, driver_id)
SELECT v.id, d.id
FROM public.vehicles v, public.drivers d
WHERE v.registration_number = 'KA05MH9876'
  AND d.license_number = 'KA0520190054321';

COMMIT;
