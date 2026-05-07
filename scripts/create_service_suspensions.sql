-- ==============================================================
-- إنشاء جدول service_suspensions المفقود في سكيما itpc
-- بناءً على تعريفه في التطبيق القديم (database.py سطر 134-157)
-- مع إضافة أعمدة الكتاب الرسمي التي يستخدمها كود React الحالي
-- ==============================================================

-- 1. إنشاء الجدول
CREATE TABLE IF NOT EXISTS itpc.service_suspensions (
    id                      BIGSERIAL PRIMARY KEY,
    service_id              BIGINT NOT NULL REFERENCES itpc.organization_services(id) ON DELETE CASCADE,
    organization_id         BIGINT REFERENCES itpc.organizations(id) ON DELETE SET NULL,
    contract_period_id      BIGINT REFERENCES itpc.service_contract_periods(id) ON DELETE SET NULL,
    effective_date          DATE NOT NULL,
    is_immediate            BOOLEAN NOT NULL DEFAULT true,
    refund_amount           NUMERIC NOT NULL DEFAULT 0,
    dropped_due_amount      NUMERIC NOT NULL DEFAULT 0,
    note                    TEXT,
    status                  TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'executed', 'cancelled')),
    executed_at             TIMESTAMPTZ,
    official_book_date      DATE,
    official_book_description TEXT,
    created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. فهارس الأداء (نفس الفهارس الموجودة في التطبيق القديم)
CREATE INDEX IF NOT EXISTS idx_suspension_service ON itpc.service_suspensions(service_id, status);
CREATE INDEX IF NOT EXISTS idx_suspension_effective_date ON itpc.service_suspensions(effective_date);

-- 3. منح الصلاحيات
GRANT ALL ON itpc.service_suspensions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE itpc.service_suspensions_id_seq TO authenticated;

-- 4. تفعيل RLS
ALTER TABLE itpc.service_suspensions ENABLE ROW LEVEL SECURITY;

-- 5. سياسة الوصول (نفس سياسة باقي جداول itpc)
CREATE POLICY "Allow all operations for authenticated users" 
ON itpc.service_suspensions
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
