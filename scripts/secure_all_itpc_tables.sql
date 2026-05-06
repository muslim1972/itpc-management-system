-- ==============================================================================
-- السكربت الشامل لتأمين مخطط itpc (استعداداً للتدقيق السيبراني)
-- ==============================================================================
-- يطبق هذا السكربت مبدأ "المنع الافتراضي" (Default Deny) على جميع جداول المخطط.
-- يُمنع الوصول لغير المسجلين (anon) نهائياً، ويُسمح بالوصول الموثوق وفقاً للصلاحيات.

-- 1. التأمين الشامل للمخطط (Zero Anon Access)
REVOKE ALL ON SCHEMA itpc FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA itpc FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA itpc FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA itpc FROM anon;

GRANT USAGE ON SCHEMA itpc TO authenticated;

-- 2. إعداد مصفوفة الجداول المستهدفة لتطبيق سياسات الأمان الصارمة
DO $$
DECLARE
    t_name text;
    tables_list text[] := ARRAY[
        'users',
        'organizations',
        'provider_companies',
        'provider_subscriptions',
        'organization_services',
        'service_items',
        'payments',
        'service_ranges',
        'service_contract_periods',
        'app_news'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_list
    LOOP
        -- التأكد من وجود الجدول قبل تنفيذ الأوامر
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'itpc' AND tablename = t_name) THEN
            
            -- أ. منح صلاحيات الأساسية للـ authenticated
            EXECUTE format('GRANT ALL ON itpc.%I TO authenticated;', t_name);
            
            -- ب. منح صلاحيات التسلسل (Sequences) إن وجدت
            IF EXISTS (SELECT FROM pg_class WHERE relkind = 'S' AND relname = t_name || '_id_seq' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'itpc')) THEN
                EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE itpc.%I TO authenticated;', t_name || '_id_seq');
            END IF;

            -- ج. تفعيل RLS بشكل إلزامي
            EXECUTE format('ALTER TABLE itpc.%I ENABLE ROW LEVEL SECURITY;', t_name);

            -- د. مسح أي سياسات سابقة لضمان بيئة نظيفة (يتم تجاهل الأخطاء إذا لم تكن موجودة بفضل IF EXISTS)
            EXECUTE format('DROP POLICY IF EXISTS "Allow select for authenticated" ON itpc.%I;', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow manage for admins" ON itpc.%I;', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.%I;', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow read access for anon" ON itpc.%I;', t_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON itpc.%I;', t_name);

            -- هـ. بناء السياسات المعتمدة (سياسة قراءة للجميع، وسياسة تعديل للمدراء فقط)
            
            -- سياسة القراءة
            EXECUTE format('
                CREATE POLICY "Allow select for authenticated" 
                ON itpc.%I
                FOR SELECT
                TO authenticated
                USING (auth.role() = ''authenticated'');
            ', t_name);

            -- سياسة التعديل مخصصة للمدراء (باستثناء جدول users لترتيبات خاصة أحياناً)
            IF t_name != 'users' THEN
                EXECUTE format('
                    CREATE POLICY "Allow manage for admins" 
                    ON itpc.%I
                    FOR ALL
                    TO authenticated
                    USING (
                        EXISTS (
                            SELECT 1 FROM itpc.users u 
                            WHERE u.user_id = auth.uid() 
                            AND u.role = ''admin''
                        )
                    )
                    WITH CHECK (
                        EXISTS (
                            SELECT 1 FROM itpc.users u 
                            WHERE u.user_id = auth.uid() 
                            AND u.role = ''admin''
                        )
                    );
                ', t_name);
            END IF;

        END IF;
    END LOOP;
END
$$;
