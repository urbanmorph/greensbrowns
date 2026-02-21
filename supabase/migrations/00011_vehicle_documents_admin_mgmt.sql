-- New enum for vehicle document types
CREATE TYPE vehicle_doc_type AS ENUM ('rc', 'insurance', 'tax_receipt', 'emission_cert', 'fitness_cert');

-- Vehicle documents table
CREATE TABLE vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  doc_type vehicle_doc_type NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE,
  UNIQUE(vehicle_id, doc_type)
);
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);

-- RLS: Admins manage all vehicle documents
CREATE POLICY "Admins can manage all vehicle documents"
  ON vehicle_documents FOR ALL USING (get_user_role() = 'admin');

-- RLS: Collectors can view docs for their own vehicles
CREATE POLICY "Collectors can view own vehicle documents"
  ON vehicle_documents FOR SELECT
  USING (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()));

-- Update vehicles RLS: admin gets full control, collector gets read-only
DROP POLICY IF EXISTS "Owners can manage own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;

CREATE POLICY "Admins can manage all vehicles"
  ON vehicles FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Collectors can view own vehicles"
  ON vehicles FOR SELECT USING (owner_id = auth.uid());

-- Storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-docs', 'vehicle-docs', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admin full access
CREATE POLICY "Admin full access vehicle docs" ON storage.objects
  FOR ALL USING (bucket_id = 'vehicle-docs' AND get_user_role() = 'admin');

-- Storage RLS: collectors can read their own vehicle docs
CREATE POLICY "Collector read own vehicle docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vehicle-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM vehicles WHERE owner_id = auth.uid()
    )
  );
