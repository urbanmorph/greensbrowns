-- Allow BWGs to create organizations and become members
-- This enables the BWG onboarding flow where they set up their org

-- Allow any authenticated user to create an organization
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow org members to update their own organization
CREATE POLICY "Org members can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Allow the creating user to add themselves as a member
CREATE POLICY "Users can add themselves to organizations"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to insert pickups for their organization
CREATE POLICY "BWG members can create pickups"
  ON pickups FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND requested_by = auth.uid()
  );

-- Allow pickup participants to update pickups
CREATE POLICY "Pickup participants can update pickups"
  ON pickups FOR UPDATE
  TO authenticated
  USING (
    collector_id = auth.uid()
    OR farmer_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    OR get_user_role() = 'admin'
  );

-- Allow anyone involved in a pickup to insert events
CREATE POLICY "Pickup participants can insert events"
  ON pickup_events FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND pickup_id IN (
      SELECT id FROM pickups WHERE
        collector_id = auth.uid()
        OR farmer_id = auth.uid()
        OR requested_by = auth.uid()
        OR get_user_role() = 'admin'
    )
  );
