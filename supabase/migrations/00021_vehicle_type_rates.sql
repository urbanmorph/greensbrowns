CREATE TABLE public.vehicle_type_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type public.vehicle_type NOT NULL UNIQUE,
  base_fare_rs NUMERIC NOT NULL,
  per_km_rs NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.vehicle_type_rates (vehicle_type, base_fare_rs, per_km_rs) VALUES
  ('trolley', 100, 8), ('auto', 205, 12), ('mini_truck', 230, 17),
  ('pickup', 470, 20), ('tempo', 470, 20), ('tipper', 500, 22),
  ('light_truck', 591, 26), ('medium_truck', 800, 35), ('truck', 1200, 45);

CREATE TRIGGER set_vehicle_type_rates_updated_at
  BEFORE UPDATE ON public.vehicle_type_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.vehicle_type_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on vehicle_type_rates"
  ON public.vehicle_type_rates FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');
