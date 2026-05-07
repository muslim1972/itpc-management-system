-- جهات لها خدمات مع عدد الخدمات لكل جهة
SELECT o.id, o.name, COUNT(os.id) as services_count
FROM itpc.organizations o
INNER JOIN itpc.organization_services os ON os.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY services_count DESC;
