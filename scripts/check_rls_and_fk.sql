-- ============================================================
-- (1) فحص سياسات RLS على جميع جداول itpc
-- ============================================================
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'itpc'
ORDER BY tablename;

-- ============================================================
-- (2) فحص السياسات المفعلة على كل جدول
-- ============================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'itpc'
ORDER BY tablename, policyname;

-- ============================================================
-- (3) فحص العلاقات (Foreign Keys) في مخطط itpc
-- ============================================================
SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'itpc'
ORDER BY tc.table_name;

-- ============================================================
-- (4) فحص: هل يوجد خدمات للجهة رقم 34؟
-- ============================================================
SELECT id, organization_id, service_type, annual_amount, due_amount
FROM itpc.organization_services
WHERE organization_id = 34;

-- ============================================================
-- (5) فحص: ما هو رقم الجهة "بريد وتوفير كربلاء"؟
-- ============================================================
SELECT id, name
FROM itpc.organizations
WHERE name LIKE '%بريد%';

-- ============================================================
-- (6) فحص: هل يوجد جدول service_suspensions؟
-- ============================================================
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'itpc' AND tablename = 'service_suspensions';
