-- (6) هل يوجد جدول service_suspensions؟
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'itpc' AND tablename = 'service_suspensions';
