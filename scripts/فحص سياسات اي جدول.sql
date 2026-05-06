-- استعلام لمعرفة حالة RLS والسياسات المطبقة على جداول المخطط itpc
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'itpc';

-- استعلام تفصيلي لعرض السياسات
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'itpc';
