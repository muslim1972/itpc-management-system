-- (2) فحص السياسات المفعلة
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'itpc'
ORDER BY tablename;
