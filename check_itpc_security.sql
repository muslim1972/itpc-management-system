-- فحص حالة تفعيل RLS على جميع الجداول في سكيما itpc
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    n.nspname = 'itpc' AND c.relkind = 'r'
ORDER BY 
    c.relname;

-- سرد جميع السياسات (Policies) المطبقة على جداول itpc
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM 
    pg_policies 
WHERE 
    schemaname = 'itpc'
ORDER BY 
    tablename, policyname;
