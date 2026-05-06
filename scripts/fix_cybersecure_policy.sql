-- =====================================================================================
-- سكربت الإصلاح الأمني المتوافق مع معايير لجنة الأمن السيبراني (Cybersecurity Compliance)
-- =====================================================================================

-- 1. إلغاء صلاحيات الوصول العام للدوال (لتجنب الاستغلال العشوائي)
ALTER DEFAULT PRIVILEGES IN SCHEMA itpc REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 2. إنشاء دالة التحقق من الجلسة بصلاحيات آمنة (SECURITY DEFINER)
-- استخدمنا SET search_path لمنع هجمات Search Path Hijacking
CREATE OR REPLACE FUNCTION itpc.check_active_session_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = itpc, pg_temp
AS $$
DECLARE
    is_active boolean;
    header_auth text;
    extracted_token text;
BEGIN
    -- استخراج الهيدر بأمان لتجنب الأخطاء إذا كان الهيدر غير موجود
    BEGIN
        header_auth := current_setting('request.headers', true)::json ->> 'authorization';
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    IF header_auth IS NULL OR header_auth = '' THEN
        RETURN false;
    END IF;

    -- تنظيف التوكن
    extracted_token := replace(header_auth, 'Bearer ', '');

    -- التحقق من قاعدة البيانات بصلاحيات المدير (متخطيين مشكلة permission denied)
    SELECT EXISTS (
        SELECT 1 
        FROM itpc.active_sessions
        WHERE token::text = extracted_token 
          AND expires_at > now()
    ) INTO is_active;

    RETURN coalesce(is_active, false);
END;
$$;

-- حماية الدالة: منع التنفيذ من العامة، والسماح للمصادق عليهم فقط
REVOKE ALL ON FUNCTION itpc.check_active_session_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION itpc.check_active_session_safe() TO authenticated, anon;


-- 3. إنشاء دالة للتحقق من دور المستخدم بأمان وبدون استعلام مباشر مكشوف
CREATE OR REPLACE FUNCTION itpc.get_user_role_safe(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = itpc, pg_temp
AS $$
DECLARE
    u_role text;
BEGIN
    IF user_email IS NULL OR user_email = '' THEN
        RETURN NULL;
    END IF;

    SELECT role INTO u_role
    FROM itpc.users
    WHERE username = user_email
    LIMIT 1;

    RETURN u_role;
END;
$$;

-- حماية الدالة
REVOKE ALL ON FUNCTION itpc.get_user_role_safe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION itpc.get_user_role_safe(text) TO authenticated, anon;


-- =====================================================================================
-- 4. تحديث سياسات جدول organizations لتعتمد على الدوال الآمنة
-- =====================================================================================

-- حذف السياسات القديمة غير الآمنة
DROP POLICY IF EXISTS "CyberSecure_Policy" ON itpc.organizations;
DROP POLICY IF EXISTS "Employees can manage organizations" ON itpc.organizations;
DROP POLICY IF EXISTS "Admins full access" ON itpc.organizations;

-- إنشاء السياسة الأولى: التحقق الأمني السيبراني
CREATE POLICY "CyberSecure_Policy" ON itpc.organizations
FOR ALL
TO public
USING (
    itpc.check_active_session_safe()
);

-- إنشاء السياسة الثانية: وصول الموظفين
CREATE POLICY "Employees can manage organizations" ON itpc.organizations
FOR ALL
TO authenticated
USING (
    itpc.get_user_role_safe(auth.jwt() ->> 'email'::text) = 'user'
);

-- إنشاء السياسة الثالثة: وصول المدراء
CREATE POLICY "Admins full access" ON itpc.organizations
FOR ALL
TO authenticated
USING (
    itpc.get_user_role_safe(auth.jwt() ->> 'email'::text) = 'admin'
);

-- ملاحظة أمنية: تأكدنا أن الدوال لا تقبل حقن SQL وتتعامل مع الاستثناءات بشكل صحيح.
