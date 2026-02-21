CREATE TABLE assigned_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES prepaid_package_plans(id),
  price_paise integer NOT NULL,
  assigned_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assigned_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assigned packages" ON assigned_packages
  FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Org members can view their assigned packages" ON assigned_packages
  FOR SELECT TO authenticated USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE TRIGGER update_assigned_packages_updated_at
  BEFORE UPDATE ON assigned_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
