-- 1. الأمان الأساسي: سحب أي صلاحيات من المستخدمين غير المسجلين (anon)
REVOKE ALL ON itpc.provider_subscriptions FROM anon;

-- 2. منح الصلاحيات للمستخدمين المسجلين (authenticated) فقط
GRANT ALL ON itpc.provider_subscriptions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE itpc.provider_subscriptions_id_seq TO authenticated;

-- 3. تفعيل الحماية على مستوى الصفوف (Row Level Security) بشكل صارم
ALTER TABLE itpc.provider_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. إزالة أي سياسات سابقة لضمان بيئة نظيفة وآمنة
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.provider_subscriptions;
DROP POLICY IF EXISTS "Allow read access for anon" ON itpc.provider_subscriptions;
DROP POLICY IF EXISTS "Enable all access" ON itpc.provider_subscriptions;
DROP POLICY IF EXISTS "Allow select for authenticated" ON itpc.provider_subscriptions;
DROP POLICY IF EXISTS "Allow manage for admins" ON itpc.provider_subscriptions;

-- 5. إضافة سياسات الأمان الدقيقة:
-- أ. سياسة القراءة (SELECT): يُسمح فقط للمستخدمين الموثوقين بالدخول للنظام بقراءة البيانات
CREATE POLICY "Allow select for authenticated" 
ON itpc.provider_subscriptions
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- ب. سياسة الإدارة (INSERT, UPDATE, DELETE): يُسمح فقط للمدراء (admin) بتعديل الاشتراكات
CREATE POLICY "Allow manage for admins" 
ON itpc.provider_subscriptions
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
