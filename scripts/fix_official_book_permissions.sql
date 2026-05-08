-- 1. Grant usage on the itpc schema to allow roles to access objects inside it
GRANT USAGE ON SCHEMA itpc TO authenticated;
GRANT USAGE ON SCHEMA itpc TO anon;
GRANT USAGE ON SCHEMA itpc TO service_role;

-- 2. Grant permissions on the official_book_records table
GRANT SELECT, INSERT, UPDATE, DELETE ON itpc.official_book_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON itpc.official_book_records TO service_role;

-- 3. Ensure RLS is enabled for cybersecurity compliance
ALTER TABLE itpc.official_book_records ENABLE ROW LEVEL SECURITY;

-- 4. Create a robust policy for authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.official_book_records;
CREATE POLICY "Allow all operations for authenticated users"
ON itpc.official_book_records
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 5. Final check: Grant permissions on sequences if any (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA itpc TO authenticated;

-- 6. Grant SELECT to authenticated on other related tables in itpc if not already present
-- to avoid further permission errors during joins
GRANT SELECT ON itpc.organizations TO authenticated;
GRANT SELECT ON itpc.organization_services TO authenticated;
