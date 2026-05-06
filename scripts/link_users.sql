-- هذا السكربت يحل مشكلة اختلاف الأسماء ويربط الحسابات بدون فقدان سجلات الـ History

-- 1. تحديث حساب الإدارة (مسلم) لربطه بحسابه في التطبيق العام وتحديث اسمه
UPDATE itpc.users u
SET user_id = p.id,
    username = p.username -- تحديث الاسم ليطابق التطبيق العام
FROM public.profiles p
WHERE u.username = 'muslim' AND p.username = 'مسلم';

-- 2. محاولة ربط بقية الحسابات التي تتطابق أسماؤها (إن وجدت)
UPDATE itpc.users u
SET user_id = p.id
FROM public.profiles p
WHERE u.username = p.username AND u.user_id IS NULL;

-- 3. طباعة إحصائية للربط
DO $$
DECLARE
    linked_count int;
    total_count int;
BEGIN
    SELECT count(*) INTO linked_count FROM itpc.users WHERE user_id IS NOT NULL;
    SELECT count(*) INTO total_count FROM itpc.users;
    
    RAISE NOTICE 'تم ربط % حسابات من أصل % حساب في نظام قسم تجهيز خدمات المعلوماتية.', linked_count, total_count;
END $$;
