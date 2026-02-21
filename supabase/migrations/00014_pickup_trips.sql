BEGIN;

CREATE TYPE trip_status AS ENUM ('in_transit', 'delivered');

CREATE TABLE public.pickup_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  trip_number INTEGER NOT NULL,
  status trip_status NOT NULL DEFAULT 'in_transit',
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  photo_metadata JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pickup_id, trip_number)
);

CREATE INDEX idx_pickup_trips_pickup_id ON public.pickup_trips(pickup_id);
CREATE INDEX idx_pickup_trips_status ON public.pickup_trips(status);

ALTER TABLE public.pickup_trips ENABLE ROW LEVEL SECURITY;

-- BWG: view trips for their org's pickups
CREATE POLICY "BWGs can view own org pickup trips"
  ON public.pickup_trips FOR SELECT USING (
    pickup_id IN (
      SELECT p.id FROM public.pickups p
      WHERE p.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Farmers: view trips for their assigned pickups
CREATE POLICY "Farmers can view assigned pickup trips"
  ON public.pickup_trips FOR SELECT USING (
    pickup_id IN (SELECT id FROM public.pickups WHERE farmer_id = auth.uid())
  );

-- Admins: full access
CREATE POLICY "Admins can manage all pickup trips"
  ON public.pickup_trips FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_trips;

COMMIT;
