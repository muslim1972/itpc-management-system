import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import sys
from database import init_db

# Usage: python src/migrate.py "postgresql://user:pass@host:port/dbname"

def migrate(pg_url):
    # Set environment variable so get_db uses PG
    os.environ['DATABASE_URL'] = pg_url
    
    sqlite_path = os.path.join(os.path.dirname(__file__), 'itpc.db')
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite database not found at: {sqlite_path}")
        return

    print("🚀 Initializing schema in PostgreSQL...")
    init_db()
    
    print("🚀 Starting data migration...")
    
    try:
        sl_conn = sqlite3.connect(sqlite_path)
        sl_conn.row_factory = sqlite3.Row
        sl_cursor = sl_conn.cursor()

        pg_conn = psycopg2.connect(pg_url)
        pg_cursor = pg_conn.cursor()

        # Tables to migrate (in order of dependency)
        tables = [
            'users',
            'organizations',
            'provider_companies',
            'provider_subscriptions',
            'organization_services',
            'service_items',
            'payments',
            'activity_log',
            'service_ranges'
        ]

        for table in tables:
            print(f"📦 Migrating table: {table}...")
            
            # Clear existing data in PG (optional but recommended for clean start)
            pg_cursor.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
            
            # Fetch from SQLite
            sl_cursor.execute(f"SELECT * FROM {table}")
            rows = sl_cursor.fetchall()
            
            if not rows:
                print(f"  (Table {table} is empty, skipping)")
                continue

            # Prepare insert
            columns = rows[0].keys()
            placeholders = ",".join(["%s"] * len(columns))
            sql = f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})"
            
            # Batch insert
            data = [tuple(row) for row in rows]
            pg_cursor.executemany(sql, data)
            print(f"  ✅ Migrated {len(rows)} rows.")

        pg_conn.commit()
        print("\n✨ Migration completed successfully!")
        
        sl_conn.close()
        pg_conn.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        if 'pg_conn' in locals():
            pg_conn.rollback()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Please provide the PostgreSQL URL. Usage: python src/migrate.py 'YOUR_PG_URL'")
    else:
        migrate(sys.argv[1])
