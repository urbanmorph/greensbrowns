-- Add volume capacity to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN volume_capacity_m3 NUMERIC;

-- Backfill based on vehicle_type using conservative mid-range estimates
UPDATE public.vehicles SET volume_capacity_m3 = CASE vehicle_type
  WHEN 'trolley'      THEN 1.2
  WHEN 'auto'         THEN 2.5
  WHEN 'mini_truck'   THEN 6
  WHEN 'pickup'       THEN 4.5
  WHEN 'tempo'        THEN 7
  WHEN 'tipper'       THEN 4
  WHEN 'light_truck'  THEN 15
  WHEN 'medium_truck' THEN 22
  WHEN 'truck'        THEN 35
END;

-- Add estimated volume to pickups (for future BWG input or system estimation)
ALTER TABLE public.pickups
  ADD COLUMN estimated_volume_m3 NUMERIC;
