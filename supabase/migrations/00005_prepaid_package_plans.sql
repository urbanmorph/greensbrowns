-- Create prepaid package plans table for admin-defined plan templates
CREATE TABLE prepaid_package_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pickup_count integer NOT NULL,
  validity_days integer NOT NULL,
  price_paise integer NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prepaid_package_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON prepaid_package_plans
  FOR SELECT TO authenticated USING (is_active = true OR get_user_role() = 'admin');

CREATE POLICY "Admins can manage plans" ON prepaid_package_plans
  FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

CREATE TRIGGER update_prepaid_package_plans_updated_at
  BEFORE UPDATE ON prepaid_package_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
