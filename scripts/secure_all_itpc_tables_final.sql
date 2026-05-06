-- ==============================================================================
-- السكربت الشامل والمتوافق لتأمين جميع جداول مخطط itpc بشكل ديناميكي (النسخة النهائية والمحسنة)
-- ==============================================================================
-- تم تحديث السكربت لجلب كافة الجداول الموجودة في المخطط برمجياً بدلاً من كتابة أسمائها يدوياً.
-- هذا يضمن عدم نسيان أي جدول (مثل service_range_price_history أو غيره).

-- 1. التأمين الشامل للمخطط (إغلاق الباب أمام المجهولين)
REVOKE ALL ON SCHEMA itpc FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA itpc FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA itpc FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA itpc FROM anon;

-- منح الصلاحيات الأساسية للمسجلين دخول
GRANT USAGE ON SCHEMA itpc TO authenticated;

-- 2. إعداد وتطبيق السياسات برمجياً على جميع الجداول
DO $$
DECLARE
    t_name text;
BEGIN
    -- جلب أسماء جميع الجداول الموجودة داخل مخطط itpc
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'itpc')
    LOOP
        -- أ. منح صلاحيات التعديل الكاملة للمسجلين
        EXECUTE format('GRANT ALL ON itpc.%I TO authenticated;', t_name);
        
        -- ب. منح صلاحيات المتسلسلات (للـ IDs) إن وجدت
        IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = t_name || '_id_seq' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'itpc')) THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE itpc.%I TO authenticated;', t_name || '_id_seq');
        END IF;

        -- ج. تفعيل الحماية RLS
        EXECUTE format('ALTER TABLE itpc.%I ENABLE ROW LEVEL SECURITY;', t_name);

        -- د. تنظيف السياسات السابقة
        EXECUTE format('DROP POLICY IF EXISTS "Allow select for authenticated" ON itpc.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow manage for admins" ON itpc.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access for anon" ON itpc.%I;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON itpc.%I;', t_name);

        -- هـ. بناء السياسة المتوافقة مع التطبيق:
        -- السماح بجميع العمليات (قراءة، إضافة، تعديل، حذف) لمن يمتلك حساباً مسجلاً فقط
        EXECUTE format('
            CREATE POLICY "Allow all operations for authenticated users" 
            ON itpc.%I
            FOR ALL
            TO authenticated
            USING (auth.role() = ''authenticated'')
            WITH CHECK (auth.role() = ''authenticated'');
        ', t_name);
    END LOOP;
END
$$;
