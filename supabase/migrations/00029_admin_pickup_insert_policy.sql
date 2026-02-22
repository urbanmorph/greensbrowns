-- Allow admins to create pickups for any organization
CREATE POLICY "Admins can create pickups for any organization"
  ON pickups FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND requested_by = auth.uid()
  );
