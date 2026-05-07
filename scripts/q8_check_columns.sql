-- فحص أعمدة جدول organization_services
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'itpc' AND table_name = 'organization_services'
ORDER BY ordinal_position;
