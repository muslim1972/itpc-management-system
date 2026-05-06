-- =====================================================================================
-- سكربت الإصلاح الأمني المتوافق مع معايير لجنة الأمن السيبراني (تحديث رقم 2)
-- =====================================================================================

-- 1. إلغاء صلاحيات الوصول العام للدوال
ALTER DEFAULT PRIVILEGES IN SCHEMA itpc REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 2. دالة أمنية شاملة تتحقق من التوكن وتجلب دور المستخدم مباشرة
CREATE OR REPLACE FUNCTION itpc.get_role_from_session()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = itpc, pg_temp
AS $$
DECLARE
    header_token text;
    v_user_id integer;
    v_role text;
BEGIN
    -- قراءة التوكن من الهيدر المخصص الذي أضفناه في React
    BEGIN
        header_token := current_setting('request.headers', true)::json ->> 'x-session-token';
    EXCEPTION WHEN OTHERS THEN
        header_token := NULL;
    END;

    -- احتياطياً: إذا لم يكن موجوداً، نقرأ من Authorization
    IF header_token IS NULL OR header_token = '' THEN
        BEGIN
            header_token := replace(current_setting('request.headers', true)::json ->> 'authorization', 'Bearer ', '');
        EXCEPTION WHEN OTHERS THEN
            header_token := NULL;
        END;
    END IF;

    IF header_token IS NULL OR header_token = '' THEN
        RETURN NULL;
    END IF;

    -- التحقق من الجلسة في جدول active_sessions بصلاحيات المدير
    SELECT user_id INTO v_user_id
    FROM itpc.active_sessions
    WHERE token::text = header_token AND expires_at > now()
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- جلب دور المستخدم المرتبط بالجلسة
    SELECT role INTO v_role
    FROM itpc.users
    WHERE id = v_user_id
    LIMIT 1;

    RETURN v_role;
END;
$$;

-- حماية الدالة
REVOKE ALL ON FUNCTION itpc.get_role_from_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION itpc.get_role_from_session() TO authenticated, anon;


-- =====================================================================================
-- 3. تحديث سياسات جدول organizations لتعتمد على الدالة الشاملة
-- =====================================================================================

-- حذف كافة السياسات القديمة المسببة للتعارض
DROP POLICY IF EXISTS "CyberSecure_Policy" ON itpc.organizations;
DROP POLICY IF EXISTS "Employees can manage organizations" ON itpc.organizations;
DROP POLICY IF EXISTS "Admins full access" ON itpc.organizations;

-- إنشاء سياسة واحدة موحدة وآمنة
CREATE POLICY "Secure Organizations Access" ON itpc.organizations
FOR ALL
TO public
USING (
    itpc.get_role_from_session() IN ('user', 'admin')
)
WITH CHECK (
    itpc.get_role_from_session() IN ('user', 'admin')
);

-- ملاحظة أمنية: الدالة الآن تتخطى مشكلة الـ JWT وتقرأ الجلسة من التوكن الفعلي في قاعدة البيانات.
