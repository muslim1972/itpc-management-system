import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import DictCursor

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL') + '?sslmode=require')
cur = conn.cursor(cursor_factory=DictCursor)

cur.execute("SELECT id, name FROM itpc.organizations WHERE name LIKE '%قيادة%'")
orgs = cur.fetchall()
print('Orgs:', [dict(o) for o in orgs])

for org in orgs:
    print(f"\n--- Org: {org['name']} (ID: {org['id']}) ---")
    cur.execute("SELECT id, service_type FROM itpc.organization_services WHERE organization_id = %s", (org['id'],))
    services = cur.fetchall()
    
    for srv in services:
        print(f"Service: {srv['service_type']} (ID: {srv['id']})")
        cur.execute("""
            SELECT i.id, i.item_category, i.provider_company_id, c.name as provider_name
            FROM itpc.service_items i
            LEFT JOIN itpc.provider_companies c ON i.provider_company_id = c.id
            WHERE i.organization_service_id = %s
        """, (srv['id'],))
        items = cur.fetchall()
        for item in items:
            print(f"  Item: {dict(item)}")

cur.close()
conn.close()
