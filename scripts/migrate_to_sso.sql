-- =====================================================================================
-- سكربت تفعيل الـ SSO لتطبيق Int-Karbala (بناءً على جلسات InfTeleKarbala)
-- =====================================================================================

-- 1. التأكد من أن الهيكلية معزولة تماماً ولا تمس الـ public (التطبيق العام للقراءة فقط)
SET search_path = itpc, pg_temp;

-- 2. تنظيف جدول المستخدمين (itpc.users)
-- بما أن الاعتماد أصبح على auth.users للتسجيل، لم نعد بحاجة لكلمات المرور هنا.
-- نحن نحتاج فقط إلى ربط (user_id) الخاص بـ auth.users لتعريف صلاحيته في التطبيق الفرعي.

-- إزالة التريكر القديم الخاص بكلمات المرور
DROP TRIGGER IF EXISTS trg_hash_password ON itpc.users;
DROP FUNCTION IF EXISTS itpc.hash_user_password() CASCADE;

-- مسح الأعمدة غير الضرورية وإضافة عمود الربط
-- ملاحظة: إذا كان جدول users يحتوي بالفعل على بيانات مهمة لا تريد حذفها، سنقوم فقط بتعديله.
-- ولكن يفضل أن يتم تفريغه وإعادة إضافة المستخدمين بالـ user_id الصحيح من لوحة الإدارة.
-- سنقوم هنا فقط بتعديل الهيكلية:
ALTER TABLE itpc.users DROP COLUMN IF EXISTS password;
ALTER TABLE itpc.users DROP COLUMN IF EXISTS session_token;

-- إضافة عمود user_id (UUID) ليرتبط بـ auth.users إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='itpc' AND table_name='users' AND column_name='user_id') THEN
        ALTER TABLE itpc.users ADD COLUMN user_id uuid;
    END IF;
END $$;

-- جعل user_id فريداً لأن الموظف لا يمكن أن يملك أكثر من صلاحية في نفس التطبيق الفرعي
ALTER TABLE itpc.users DROP CONSTRAINT IF EXISTS users_user_id_key;
ALTER TABLE itpc.users ADD CONSTRAINT users_user_id_key UNIQUE (user_id);


-- 3. حذف جدول الجلسات المخترع (لأن الجلسات تدار من قبل Supabase Auth الآن)
DROP TABLE IF EXISTS itpc.active_sessions CASCADE;
DROP FUNCTION IF EXISTS itpc.login_user_v1(text, text) CASCADE;
DROP FUNCTION IF EXISTS itpc.check_active_session_safe() CASCADE;
DROP FUNCTION IF EXISTS itpc.get_role_from_session() CASCADE;
DROP FUNCTION IF EXISTS itpc.get_user_role_safe(text) CASCADE;


-- 4. دوال مساعدة أمنية (Security Definer) تقرأ فقط من itpc.users بناءً على auth.uid()
CREATE OR REPLACE FUNCTION itpc.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = itpc, pg_temp
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role
    FROM itpc.users
    WHERE user_id = auth.uid()
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- حماية الدالة
REVOKE ALL ON FUNCTION itpc.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION itpc.get_my_role() TO authenticated;


-- =====================================================================================
-- 5. تحديث سياسات الأمان (RLS Policies) لتعتمد على الدالة الجديدة
-- =====================================================================================

-- جدول itpc.organizations
DROP POLICY IF EXISTS "Secure Organizations Access" ON itpc.organizations;
DROP POLICY IF EXISTS "CyberSecure_Policy" ON itpc.organizations;
DROP POLICY IF EXISTS "Employees can manage organizations" ON itpc.organizations;
DROP POLICY IF EXISTS "Admins full access" ON itpc.organizations;

-- يسمح بالوصول للجهات فقط لمن يملك دور 'user' أو 'admin' في جدول itpc.users
CREATE POLICY "SSO Organizations Access" ON itpc.organizations
FOR ALL
TO authenticated
USING (
    itpc.get_my_role() IN ('user', 'admin')
)
WITH CHECK (
    itpc.get_my_role() IN ('user', 'admin')
);


-- جدول itpc.users (يجب أن يتمكن المدير من إدارته، والمستخدم العادي من قراءة دوره)
DROP POLICY IF EXISTS "Admins can manage itpc users" ON itpc.users;
DROP POLICY IF EXISTS "Users can read own role" ON itpc.users;

CREATE POLICY "Admins can manage itpc users" ON itpc.users
FOR ALL
TO authenticated
USING (
    itpc.get_my_role() = 'admin'
)
WITH CHECK (
    itpc.get_my_role() = 'admin'
);

CREATE POLICY "Users can read own role" ON itpc.users
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- =====================================================================================
-- تمت التهيئة بنجاح للمنطق الحديث (SSO) مع الحفاظ على قاعدة التطبيق العام للقراءة فقط
-- =====================================================================================
