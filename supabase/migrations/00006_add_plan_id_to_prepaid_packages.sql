-- Add plan_id foreign key to prepaid_packages to link to plan templates
ALTER TABLE prepaid_packages
  ADD COLUMN plan_id uuid REFERENCES prepaid_package_plans(id);

COMMENT ON COLUMN prepaid_packages.plan_id IS 'Optional reference to the prepaid plan template used for this package';
