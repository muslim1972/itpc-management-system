import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import os

def get_config():
    url = os.environ.get('DATABASE_URL')
    path = os.path.join(os.path.dirname(__file__), 'itpc.db')
    return url, path

class DbWrapper:
    def __init__(self, conn, is_postgres):
        self.conn = conn
        self.is_postgres = is_postgres

    def execute(self, sql, params=()):
        if self.is_postgres:
            sql = sql.replace('?', '%s')
            sql = sql.replace("datetime('now')", "CURRENT_TIMESTAMP")
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        else:
            cursor = self.conn.cursor()
        
        cursor.execute(sql, params)
        return cursor

    def cursor(self):
        # Returns a cursor. For Postgres, uses RealDictCursor.
        if self.is_postgres:
            return self.conn.cursor(cursor_factory=RealDictCursor)
        return self.conn.cursor()

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()
    
    @property
    def total_changes(self):
        # Specific for DELETE/UPDATE check in app.py
        return self.conn.total_changes if not self.is_postgres else 1 # Simple fallback

def get_db():
    database_url, db_path = get_config()
    if database_url:
        # PostgreSQL
        conn = psycopg2.connect(database_url)
        return DbWrapper(conn, True)
    else:
        # Local SQLite
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return DbWrapper(conn, False)

def init_db():
    database_url, db_path = get_config()
    conn = get_db()
    cursor = conn.cursor()
    
    # التحويل التلقائي للأوامر SQL لتتوافق مع Postgres إذا لزم الأمر
    is_postgres = (database_url is not None)

    def run_sql(sql):
        if is_postgres:
            sql = sql.replace("AUTOINCREMENT", "") # Postgres uses SERIAL / IDENTITY implicitly or we use SERIAL
            sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            sql = sql.replace("datetime('now')", "CURRENT_TIMESTAMP")
        
        # If it's a SELECT COUNT, ensure we have an alias for easy dict access
        if is_postgres and "COUNT(*)" in sql.upper() and " AS " not in sql.upper():
            sql = sql.replace("COUNT(*)", "COUNT(*) AS count")
            
        cursor.execute(sql)

    # ─────────────────────────────────────────────────────────────
    # USERS
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS users (
            id              SERIAL PRIMARY KEY,
            username        TEXT UNIQUE NOT NULL,
            password        TEXT NOT NULL,
            role            TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login      TEXT
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # ORGANIZATIONS
    # this is the main entity shown in MainPage / DetailPage
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS organizations (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL UNIQUE,
            phone           TEXT,
            address         TEXT,
            location        TEXT,
            status          TEXT DEFAULT 'active'
                            CHECK(status IN ('active', 'inactive', 'pending')),
            notes           TEXT,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # PROVIDER COMPANIES
    # companies that provide services like Huawei / Nokia / local ISPs
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS provider_companies (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL UNIQUE,
            phone           TEXT,
            address         TEXT,
            email           TEXT,
            is_active       INTEGER DEFAULT 1,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # PROVIDER SUBSCRIPTIONS
    # subscription catalog for each provider company
    # shown in admin company details page
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS provider_subscriptions (
            id                  SERIAL PRIMARY KEY,
            provider_company_id INTEGER NOT NULL,
            service_type        TEXT NOT NULL
                                CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')),
            item_category       TEXT NOT NULL
                                CHECK(item_category IN ('Line', 'Bundle', 'Other')),
            item_name           TEXT NOT NULL,
            price               REAL NOT NULL DEFAULT 0,
            unit_label          TEXT,
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (provider_company_id) REFERENCES provider_companies(id) ON DELETE CASCADE
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # ORGANIZATION SERVICES
    # one organization can have many services
    # Example: Wireless + FTTH together
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS organization_services (
            id                      SERIAL PRIMARY KEY,
            organization_id         INTEGER NOT NULL,
            service_type            TEXT NOT NULL
                                    CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')),
            payment_method          TEXT NOT NULL DEFAULT 'شهري'
                                    CHECK(payment_method IN ('شهري', 'كل 3 أشهر', 'سنوي')),
            device_ownership        TEXT NOT NULL DEFAULT 'الشركة'
                                    CHECK(device_ownership IN ('الشركة', 'المنظمة', 'الوزارة')),
            annual_amount           REAL NOT NULL DEFAULT 0,
            paid_amount             REAL NOT NULL DEFAULT 0,
            due_amount              REAL NOT NULL DEFAULT 0,
            due_date                TEXT,
            last_payment_amount     REAL DEFAULT 0,
            last_payment_date       TEXT,
            notes                   TEXT,
            is_active               INTEGER DEFAULT 1,
            created_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # SERVICE DETAILS / ROWS
    # detailed rows inside each service
    #
    # examples:
    # Wireless -> line row
    # Wireless -> bundle row
    # FTTH     -> line row
    # Optical  -> line row
    # Other    -> custom row
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS service_items (
            id                      SERIAL PRIMARY KEY,
            service_id              INTEGER NOT NULL,
            item_category           TEXT NOT NULL
                                    CHECK(item_category IN ('Line', 'Bundle', 'Other')),
            provider_company_id     INTEGER,
            item_name               TEXT,
            line_type               TEXT,
            bundle_type             TEXT,
            quantity                REAL NOT NULL DEFAULT 1,
            unit_price              REAL NOT NULL DEFAULT 0,
            total_price             REAL NOT NULL DEFAULT 0,
            notes                   TEXT,
            created_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE,
            FOREIGN KEY (provider_company_id) REFERENCES provider_companies(id) ON DELETE SET NULL
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # PAYMENTS
    # payment history for each service
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS payments (
            id                  SERIAL PRIMARY KEY,
            service_id          INTEGER NOT NULL,
            amount              REAL NOT NULL,
            payment_date        TEXT NOT NULL,
            note                TEXT,
            created_by          INTEGER,
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # ─────────────────────────────────────────────────────────────
    # ACTIVITY LOG
    # for history page and admin tracking
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id                  SERIAL PRIMARY KEY,
            user_id             INTEGER,
            action              TEXT NOT NULL,
            entity_type         TEXT,
            entity_id           INTEGER,
            details             TEXT,
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    # ─────────────────────────────────────────────────────────────
    # SPECIAL SERVICE RANGES
    # independent from provider companies
    # for services like: fna, gcc, انترانيت, دولي
    # ─────────────────────────────────────────────────────────────
    run_sql("""
        CREATE TABLE IF NOT EXISTS service_ranges (
            id              SERIAL PRIMARY KEY,
            service_name    TEXT NOT NULL,
            range_from      INTEGER NOT NULL,
            range_to        INTEGER NOT NULL,
            price           REAL NOT NULL DEFAULT 0,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # ─────────────────────────────────────────────────────────────
    # INDEXES
    # ─────────────────────────────────────────────────────────────
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_name ON organizations(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_provider_name ON provider_companies(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_org ON organization_services(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_item_service ON service_items(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_service ON payments(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_ranges_name ON service_ranges(service_name)")

    # ─────────────────────────────────────────────────────────────
    # SEED USERS
    # ─────────────────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM users")
    row = cursor.fetchone()
    # Handle both tuple (SQLite) and dict (Postgres RealDictCursor)
    count = row[0] if row and not isinstance(row, dict) else (row.get('count') if row else 0)
    if count == 0:
        placeholder = "%s" if is_postgres else "?"
        cursor.executemany(f"""
            INSERT INTO users (username, password, role)
            VALUES ({placeholder}, {placeholder}, {placeholder})
        """, [
            ('admin1', 'a123', 'admin'),
            ('user1', 'u123', 'user')
        ])

    # ─────────────────────────────────────────────────────────────
    # SEED PROVIDER COMPANIES
    # ─────────────────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM provider_companies")
    row = cursor.fetchone()
    count = row[0] if row and not isinstance(row, dict) else (row.get('count') if row else 0)
    if count == 0:
        placeholder = "%s" if is_postgres else "?"
        cursor.executemany(f"""
            INSERT INTO provider_companies (name)
            VALUES ({placeholder})
        """, [
            ('Huawei',),
            ('Nokia',),
            ('ZTE',),
            ('FiberHome',)
        ])

    # ─────────────────────────────────────────────────────────────
    # SEED ORGANIZATIONS
    # ─────────────────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM organizations")
    row = cursor.fetchone()
    count = row[0] if row and not isinstance(row, dict) else (row.get('count') if row else 0)
    if count == 0:
        placeholder = "%s" if is_postgres else "?"
        cursor.executemany(f"""
            INSERT INTO organizations (name, phone, address, location, status)
            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """, [
            ('Tech Solutions Inc.', '+9647501234567', '123 Technology Street', 'Baghdad', 'active'),
            ('Global Industries Ltd.', '+9647502345678', '456 Business Avenue', 'Erbil', 'active'),
            ('Modern Business Solutions', '+9647506789012', '987 Modern Street', 'Karbala', 'pending')
        ])

    database_url, db_path = get_config()
    conn.commit()
    conn.close()
    print(f"✅ Database initialized at: {database_url if database_url else db_path}")


if __name__ == '__main__':
    init_db()