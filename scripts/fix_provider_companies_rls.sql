-- 1. الأمان الأساسي: سحب أي صلاحيات من المستخدمين غير المسجلين (anon)
REVOKE ALL ON SCHEMA itpc FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA itpc FROM anon;

-- 2. منح الصلاحيات للمستخدمين المسجلين (authenticated) فقط
GRANT USAGE ON SCHEMA itpc TO authenticated;
GRANT ALL ON itpc.provider_companies TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE itpc.provider_companies_id_seq TO authenticated;

-- 3. تفعيل الحماية على مستوى الصفوف (Row Level Security) بشكل صارم
ALTER TABLE itpc.provider_companies ENABLE ROW LEVEL SECURITY;

-- 4. إزالة أي سياسات سابقة لضمان بيئة نظيفة وآمنة
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.provider_companies;
DROP POLICY IF EXISTS "Allow read access for anon" ON itpc.provider_companies;
DROP POLICY IF EXISTS "Enable all access" ON itpc.provider_companies;
DROP POLICY IF EXISTS "Allow select for authenticated" ON itpc.provider_companies;
DROP POLICY IF EXISTS "Allow manage for admins" ON itpc.provider_companies;

-- 5. إضافة سياسات الأمان الدقيقة:
-- أ. سياسة القراءة (SELECT): يُسمح فقط للمستخدمين الموثوقين بالدخول للنظام بقراءة البيانات
CREATE POLICY "Allow select for authenticated" 
ON itpc.provider_companies
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- ب. سياسة الإدارة (INSERT, UPDATE, DELETE): يُسمح فقط للمدراء (admin) بتعديل الشركات
-- يعتمد هذا على جدول itpc.users وحقل user_id الذي تم ربطه بحسابات Supabase
CREATE POLICY "Allow manage for admins" 
ON itpc.provider_companies
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM itpc.users u 
        WHERE u.user_id = auth.uid() 
        AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM itpc.users u 
        WHERE u.user_id = auth.uid() 
        AND u.role = 'admin'
    )
);
