-- (5) ما هي أرقام الجهات الموجودة فعلاً في جدول الخدمات؟
SELECT DISTINCT organization_id 
FROM itpc.organization_services 
ORDER BY organization_id;
