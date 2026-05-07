-- (1) فحص حالة RLS على جميع جداول itpc
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'itpc'
ORDER BY tablename;
