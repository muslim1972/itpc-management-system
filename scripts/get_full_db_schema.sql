-- سكربت استخراج الهيكلية والسياسات والصلاحيات لقاعدة البيانات (سكيما itpc)

-- 1. استخراج جميع الجداول وأعمدتها في سكيما itpc
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'itpc'
ORDER BY 
    table_name, ordinal_position;

-- 2. استخراج حالة تفعيل RLS (Row Level Security) لكل جدول
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

-- 3. استخراج جميع سياسات RLS (Policies) المطبقة في السكيما
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

-- 4. استخراج العلاقات والارتباطات (Foreign Keys) بين الجداول
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='itpc';

-- 5. فحص الصلاحيات (Grants) الممنوحة على الجداول (مهم جداً لاكتشاف مشكلة permission denied)
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_schema = 'itpc' 
    AND table_name IN ('active_sessions', 'organizations');

-- 6. استخراج الدوال (Functions) في السكيما
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosecdef as is_security_definer,
    pg_get_functiondef(p.oid) as function_definition
FROM 
    pg_proc p
JOIN 
    pg_namespace n ON n.oid = p.pronamespace
WHERE 
    n.nspname = 'itpc';

-- 7. استخراج المشغلات (Triggers)
SELECT 
    trigger_schema,
    trigger_name,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing,
    event_manipulation
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'itpc' OR trigger_schema = 'itpc';
