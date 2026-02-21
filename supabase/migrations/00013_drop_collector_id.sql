-- Drop collector-specific policies
DROP POLICY IF EXISTS "Collectors can view assigned pickups" ON public.pickups;
DROP POLICY IF EXISTS "Collectors can update assigned pickups" ON public.pickups;

-- Drop policies that reference collector_id (will recreate without it)
DROP POLICY IF EXISTS "Participants can create pickup events" ON public.pickup_events;
DROP POLICY IF EXISTS "Pickup participants can insert events" ON public.pickup_events;
DROP POLICY IF EXISTS "Pickup participants can update pickups" ON public.pickups;
DROP POLICY IF EXISTS "Participants can view pickup events" ON public.pickup_events;

-- Drop index and column
DROP INDEX IF EXISTS idx_pickups_collector_id;
ALTER TABLE public.pickups DROP COLUMN IF EXISTS collector_id;

-- Recreate policies without collector_id

CREATE POLICY "Pickup participants can update pickups" ON public.pickups
  FOR UPDATE USING (
    (farmer_id = auth.uid())
    OR (organization_id IN (SELECT get_user_org_ids()))
    OR (get_user_role() = 'admin'::user_role)
  );

CREATE POLICY "Participants can create pickup events" ON public.pickup_events
  FOR INSERT WITH CHECK (
    (changed_by = auth.uid())
    AND (pickup_id IN (
      SELECT id FROM pickups
      WHERE requested_by = auth.uid()
        OR farmer_id = auth.uid()
    ))
  );

CREATE POLICY "Pickup participants can insert events" ON public.pickup_events
  FOR INSERT WITH CHECK (
    (changed_by = auth.uid())
    AND (pickup_id IN (
      SELECT id FROM pickups
      WHERE farmer_id = auth.uid()
        OR requested_by = auth.uid()
        OR get_user_role() = 'admin'::user_role
    ))
  );

CREATE POLICY "Participants can view pickup events" ON public.pickup_events
  FOR SELECT USING (
    pickup_id IN (
      SELECT id FROM pickups
      WHERE requested_by = auth.uid()
        OR farmer_id = auth.uid()
        OR organization_id IN (SELECT get_user_org_ids())
    )
  );
