-- ==============================================================================
-- إنشاء الجدول المفقود (سجل أسعار الرينجات) وتأمينه
-- ==============================================================================
-- الكود البرمجي في واجهة "الباقات والرينجات" (AdminPage.jsx) مبرمج ليقوم بحفظ وعرض 
-- سجل تغيير الأسعار، ولكنه يبحث عن هذا الجدول ولا يجده في قاعدة البيانات.

CREATE TABLE IF NOT EXISTS itpc.service_range_price_history (
    id SERIAL PRIMARY KEY,
    service_range_id INTEGER NOT NULL,
    old_price REAL NOT NULL,
    new_price REAL NOT NULL,
    official_book_date DATE,
    official_book_description TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_range FOREIGN KEY (service_range_id) REFERENCES itpc.service_ranges (id) ON DELETE CASCADE
);

-- منح الصلاحيات للمسجلين دخول
GRANT ALL ON itpc.service_range_price_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE itpc.service_range_price_history_id_seq TO authenticated;

-- تفعيل وتأمين RLS بشكل متوافق مع النظام الحالي
ALTER TABLE itpc.service_range_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON itpc.service_range_price_history;
CREATE POLICY "Allow all operations for authenticated users" 
ON itpc.service_range_price_history
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
