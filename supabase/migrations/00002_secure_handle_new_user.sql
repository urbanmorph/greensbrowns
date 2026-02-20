-- Harden handle_new_user() to reject admin self-registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role user_role;
BEGIN
  -- Reject admin role from user metadata; default to bwg
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'bwg');
  IF _role = 'admin' THEN
    _role := 'bwg';
  END IF;

  INSERT INTO profiles (id, email, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _role
  );
  RETURN NEW;
END;
$$;
