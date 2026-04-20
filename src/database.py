import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime, date, timedelta

try:
    from dotenv import load_dotenv
    # Load .env file if it exists (for local development)
    load_dotenv()
except ImportError:
    pass

# السطر الذي سيحل مشكلة الـ ImportError في Render
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_config():
    url = DATABASE_URL
    if not url:
        raise ValueError("DATABASE_URL is not set. The application requires a PostgreSQL connection string to run.")
    return url, None


class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        self._lastrowid = None

    def __getattr__(self, name):
        return getattr(self.cursor, name)

    @property
    def lastrowid(self):
        return self._lastrowid

    def set_lastrowid(self, rowid):
        self._lastrowid = rowid

class DbWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.is_postgres = True  # Always true now

    def execute(self, sql, params=()):
        sql = sql.replace('?', '%s')
        sql = sql.replace("datetime('now')", "CURRENT_TIMESTAMP")
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        
        # محاكاة lastrowid لـ Postgres
        if sql.strip().upper().startswith("INSERT") and "RETURNING" not in sql.upper():
            sql = sql.rstrip().rstrip(';') + " RETURNING id"
            cursor.execute(sql, params)
            row = cursor.fetchone()
            wrapper = PostgresCursorWrapper(cursor)
            if row:
                wrapper.set_lastrowid(row['id'])
            return wrapper
        
        cursor.execute(sql, params)
        return PostgresCursorWrapper(cursor)

    def cursor(self):
        return self.conn.cursor(cursor_factory=RealDictCursor)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.close()
    
    @property
    def total_changes(self):
        return 1

def get_db():
    database_url, _ = get_config()
    
    # Ensure sslmode=require for Supabase/External DBs
    if 'sslmode' not in database_url:
        separator = '&' if '?' in database_url else '?'
        database_url += f"{separator}sslmode=require"
        
    retries = 3
    for attempt in range(retries):
        try:
            # تنظيف الرابط من معاملات سوبابيس التي قد تزعج مكتبة psycopg2
            url_to_use = database_url
            if 'pgbouncer=true' in url_to_use:
                url_to_use = url_to_use.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '')
            
            conn = psycopg2.connect(url_to_use)
            # استخدام كوتيشن للسكيما لضمان عدم وجود أخطاء في التسمية
            with conn.cursor() as cur:
                cur.execute('SET search_path TO "itpc", "public";')
            return DbWrapper(conn)
        except psycopg2.OperationalError as e:
            if attempt < retries - 1:
                import time
                time.sleep(1)
                continue
            raise e


# ── Helpers from New Version ──────────────────────────────────────────────────
def _column_exists(cursor, table_name, column_name):
    # Only PostgreSQL implementation needed now
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name=%s AND column_name=%s
    """, (table_name, column_name))
    return cursor.fetchone() is not None

def _table_exists(cursor, table_name):
    # Only PostgreSQL implementation needed now
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name=%s
    """, (table_name,))
    return cursor.fetchone() is not None

def _safe_parse_date(value):
    if not value: return None
    value = str(value).strip()
    formats = ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"]
    for fmt in formats:
        try: return datetime.strptime(value, fmt).date()
        except ValueError: continue
    try: return datetime.fromisoformat(value).date()
    except Exception: return None

def _add_months(base_date, months):
    year = base_date.year + ((base_date.month - 1 + months) // 12)
    month = ((base_date.month - 1 + months) % 12) + 1
    if month == 2:
        is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
        last_day = 29 if is_leap else 28
    elif month in [4, 6, 9, 11]: last_day = 30
    else: last_day = 31
    day = min(base_date.day, last_day)
    return date(year, month, day)

def _calculate_period_end_date(start_date, duration_unit, duration_value):
    if not start_date: start_date = date.today()
    duration_value = int(duration_value or 1)
    duration_unit = (duration_unit or "شهري").strip()
    if duration_unit == "يومي": return start_date + timedelta(days=duration_value)
    elif duration_unit == "شهري": return _add_months(start_date, duration_value)
    elif duration_unit == "سنوي": return _add_months(start_date, duration_value * 12)
    return _add_months(start_date, 1)

# ── Migration Helpers ─────────────────────────────────────────────────────────
def _ensure_payments_contract_period_column(cursor):
    if not _column_exists(cursor, "payments", "contract_period_id"):
        cursor.execute("ALTER TABLE payments ADD COLUMN contract_period_id INTEGER")

def _ensure_users_role_column(cursor):
    if _table_exists(cursor, "users") and not _column_exists(cursor, "users", "role"):
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        cursor.execute("UPDATE users SET role = 'admin' WHERE username = 'admin1'")

def _ensure_organization_services_columns(cursor):
    if not _table_exists(cursor, "organization_services"):
        return

    # الأعمدة الأساسية للعقود والمبالغ
    contract_cols = [
        ("contract_created_at", "TEXT"),
        ("contract_duration_unit", "TEXT NOT NULL DEFAULT 'شهري'"),
        ("contract_duration_value", "INTEGER NOT NULL DEFAULT 1"),
        ("payment_interval_days", "INTEGER NOT NULL DEFAULT 1"),
        ("annual_amount", "REAL NOT NULL DEFAULT 0"),
        ("paid_amount", "REAL NOT NULL DEFAULT 0"),
        ("due_amount", "REAL NOT NULL DEFAULT 0"),
        ("due_date", "TEXT"),
        ("last_payment_amount", "REAL DEFAULT 0"),
        ("last_payment_date", "TEXT"),
        ("is_active", "INTEGER DEFAULT 1"),
    ]
    for col, col_def in contract_cols:
        if not _column_exists(cursor, "organization_services", col):
            cursor.execute(f"ALTER TABLE organization_services ADD COLUMN {col} {col_def}")

    # أعمدة التعليق (Suspension)
    if not _column_exists(cursor, "organization_services", "service_status"):
        cursor.execute("ALTER TABLE organization_services ADD COLUMN service_status TEXT NOT NULL DEFAULT 'active'")
        cursor.execute("UPDATE organization_services SET service_status = CASE WHEN COALESCE(is_active, 1) = 1 THEN 'active' ELSE 'suspended' END")

    suspension_cols = [
        ("suspension_effective_date", "TEXT"),
        ("suspended_at", "TEXT"),
        ("scheduled_suspend_at", "TEXT"),
        ("suspension_refund_amount", "REAL NOT NULL DEFAULT 0"),
        ("suspension_dropped_amount", "REAL NOT NULL DEFAULT 0"),
        ("suspension_note", "TEXT"),
    ]
    for col, col_type in suspension_cols:
        if not _column_exists(cursor, "organization_services", col):
            cursor.execute(f"ALTER TABLE organization_services ADD COLUMN {col} {col_type}")

    # أعمدة الكتاب الرسمي (Official Book) في حال عدم وجودها في الجدول الأصلي
    official_cols = [
        ("official_book_date", "TEXT"),
        ("official_book_description", "TEXT"),
    ]
    for col, col_type in official_cols:
        if not _column_exists(cursor, "organization_services", col):
            cursor.execute(f"ALTER TABLE organization_services ADD COLUMN {col} {col_type}")


def _ensure_provider_companies_columns(cursor):
    if not _table_exists(cursor, "provider_companies"):
        return
    if not _column_exists(cursor, "provider_companies", "contact_person"):
        cursor.execute("ALTER TABLE provider_companies ADD COLUMN contact_person TEXT")
    if not _column_exists(cursor, "provider_companies", "address"):
        cursor.execute("ALTER TABLE provider_companies ADD COLUMN address TEXT")

def _ensure_service_suspension_columns(cursor):
    # This was merged into _ensure_organization_services_columns for clarity
    _ensure_organization_services_columns(cursor)

# ── Seeding & Maintenance ─────────────────────────────────────────────────────
def _seed_initial_contract_periods_for_existing_services(cursor, is_postgres):
    cursor.execute("""
        SELECT os.id, os.annual_amount, os.paid_amount, os.due_amount, 
               os.contract_created_at, os.contract_duration_unit, os.contract_duration_value, 
               os.payment_method, os.notes
        FROM organization_services os
        WHERE NOT EXISTS (SELECT 1 FROM service_contract_periods scp WHERE scp.service_id = os.id)
    """)
    services = cursor.fetchall()
    placeholder = "%s" if is_postgres else "?"
    for s in services:
        start_date = _safe_parse_date(s["contract_created_at"]) or date.today()
        dur_unit = s["contract_duration_unit"] or "شهري"
        dur_val = int(s["contract_duration_value"] or 1)
        end_date = _calculate_period_end_date(start_date, dur_unit, dur_val)
        base = float(s["annual_amount"] or 0)
        paid = float(s["paid_amount"] or 0)
        due = float(s["due_amount"] or max(base - paid, 0))
        
        cursor.execute(f"""
            INSERT INTO service_contract_periods (
                service_id, period_number, period_label, start_date, end_date,
                contract_duration_unit, contract_duration_value, payment_method,
                base_amount, carried_debt, total_amount, paid_amount, due_amount,
                status, notes, created_at, updated_at
            ) VALUES ({placeholder}, 1, 'الفترة 1', {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, {placeholder}, {placeholder}, 'active', {placeholder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (s["id"], start_date.isoformat(), end_date.isoformat(), dur_unit, dur_val, s["payment_method"] or "شهري", base, base, paid, due, s["notes"]))

def _link_old_payments_to_first_period(cursor, is_postgres):
    cursor.execute("SELECT p.id, p.service_id FROM payments p WHERE p.contract_period_id IS NULL")
    payments = cursor.fetchall()
    placeholder = "%s" if is_postgres else "?"
    for p in payments:
        cursor.execute(f"SELECT id FROM service_contract_periods WHERE service_id = {placeholder} ORDER BY period_number ASC, id ASC LIMIT 1", (p["service_id"],))
        period = cursor.fetchone()
        if period:
            p_id = period[0] if not is_postgres else period['id']
            cursor.execute(f"UPDATE payments SET contract_period_id = {placeholder} WHERE id = {placeholder}", (p_id, p["id"]))

def _sync_service_summary_from_active_periods(cursor, is_postgres):
    cursor.execute("""
        SELECT os.id AS service_id, scp.id AS period_id, scp.start_date, scp.end_date,
               scp.payment_method, scp.contract_duration_unit, scp.contract_duration_value,
               scp.total_amount, scp.paid_amount, scp.due_amount
        FROM organization_services os
        LEFT JOIN service_contract_periods scp ON scp.service_id = os.id AND scp.status = 'active'
    """)
    rows = cursor.fetchall()
    placeholder = "%s" if is_postgres else "?"
    for r in rows:
        if r["period_id"] is None: continue
        cursor.execute(f"""
            UPDATE organization_services SET
                annual_amount = {placeholder}, paid_amount = {placeholder}, due_amount = {placeholder},
                contract_created_at = {placeholder}, contract_duration_unit = {placeholder},
                contract_duration_value = {placeholder}, due_date = {placeholder},
                payment_method = {placeholder}, updated_at = CURRENT_TIMESTAMP
            WHERE id = {placeholder}
        """, (float(r["total_amount"] or 0), float(r["paid_amount"] or 0), float(r["due_amount"] or 0), 
              r["start_date"], r["contract_duration_unit"] or "شهري", int(r["contract_duration_value"] or 1),
              r["end_date"], r["payment_method"] or "شهري", r["service_id"]))

def init_db():
    database_url, db_path = get_config()
    conn = get_db()
    cursor = conn.cursor()
    is_postgres = (database_url is not None)

    def run_sql(sql):
        if is_postgres:
            sql = sql.replace("AUTOINCREMENT", "")
            sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            sql = sql.replace("datetime('now')", "CURRENT_TIMESTAMP")
            # ضمان تشغيل الكود في السكيما الصحيحة
            if "CREATE TABLE" in sql.upper() and "ITPC." not in sql.upper():
                sql = sql.replace("CREATE TABLE", "CREATE TABLE itpc.")
        if is_postgres and "COUNT(*)" in sql.upper() and " AS " not in sql.upper():
            sql = sql.replace("COUNT(*)", "COUNT(*) AS count")
        cursor.execute(sql)

    # ─────────────────────────────────────────────────────────────
    # Schemas
    # ─────────────────────────────────────────────────────────────
    run_sql("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin', 'user')), created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_login TEXT)")
    run_sql("CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, phone TEXT, address TEXT, location TEXT, status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')), notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    run_sql("CREATE TABLE IF NOT EXISTS provider_companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, contact_person TEXT, phone TEXT, address TEXT, email TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    run_sql("CREATE TABLE IF NOT EXISTS provider_subscriptions (id SERIAL PRIMARY KEY, provider_company_id INTEGER NOT NULL, service_type TEXT NOT NULL CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')), item_category TEXT NOT NULL CHECK(item_category IN ('Line', 'Bundle', 'Other')), item_name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, unit_label TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (provider_company_id) REFERENCES provider_companies(id) ON DELETE CASCADE)")
    run_sql("CREATE TABLE IF NOT EXISTS organization_services (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, service_type TEXT NOT NULL CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')), payment_method TEXT NOT NULL DEFAULT 'شهري' CHECK(payment_method IN ('يومي', 'شهري', 'كل 3 أشهر', 'سنوي')), payment_interval_days INTEGER DEFAULT 1, device_ownership TEXT NOT NULL DEFAULT 'الشركة' CHECK(device_ownership IN ('الشركة', 'المنظمة', 'الوزارة')), annual_amount REAL NOT NULL DEFAULT 0, paid_amount REAL NOT NULL DEFAULT 0, due_amount REAL NOT NULL DEFAULT 0, contract_created_at TEXT, contract_duration_unit TEXT NOT NULL DEFAULT 'شهري' CHECK(contract_duration_unit IN ('يومي', 'شهري', 'سنوي')), contract_duration_value INTEGER NOT NULL DEFAULT 1, due_date TEXT, last_payment_amount REAL DEFAULT 0, last_payment_date TEXT, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE)")
    run_sql("CREATE TABLE IF NOT EXISTS service_items (id SERIAL PRIMARY KEY, service_id INTEGER NOT NULL, item_category TEXT NOT NULL CHECK(item_category IN ('Line', 'Bundle', 'Other')), provider_company_id INTEGER, item_name TEXT, line_type TEXT, bundle_type TEXT, quantity REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0, total_price REAL NOT NULL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE, FOREIGN KEY (provider_company_id) REFERENCES provider_companies(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, service_id INTEGER NOT NULL, amount REAL NOT NULL, payment_date TEXT NOT NULL, note TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS activity_log (id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, details TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS service_ranges (id SERIAL PRIMARY KEY, service_name TEXT NOT NULL, range_from INTEGER NOT NULL, range_to INTEGER NOT NULL, price REAL NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    
    # New tables
    run_sql("CREATE TABLE IF NOT EXISTS service_contract_periods (id SERIAL PRIMARY KEY, service_id INTEGER NOT NULL, period_number INTEGER NOT NULL DEFAULT 1, period_label TEXT, start_date TEXT NOT NULL, end_date TEXT NOT NULL, contract_duration_unit TEXT NOT NULL DEFAULT 'شهري' CHECK(contract_duration_unit IN ('يومي', 'شهري', 'سنوي')), contract_duration_value INTEGER NOT NULL DEFAULT 1, payment_method TEXT NOT NULL DEFAULT 'شهري' CHECK(payment_method IN ('يومي', 'شهري', 'كل 3 أشهر', 'سنوي')), base_amount REAL NOT NULL DEFAULT 0, carried_debt REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, paid_amount REAL NOT NULL DEFAULT 0, due_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'archived')), closed_reason TEXT, previous_period_id INTEGER, renewal_created_at TEXT, closed_at TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE, FOREIGN KEY (previous_period_id) REFERENCES service_contract_periods(id) ON DELETE SET NULL, UNIQUE(service_id, period_number))")
    run_sql("CREATE TABLE IF NOT EXISTS provider_subscription_price_history (id SERIAL PRIMARY KEY, provider_subscription_id INTEGER NOT NULL, old_price REAL NOT NULL DEFAULT 0, new_price REAL NOT NULL DEFAULT 0, changed_by INTEGER, note TEXT, changed_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (provider_subscription_id) REFERENCES provider_subscriptions(id) ON DELETE CASCADE, FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS service_range_price_history (id SERIAL PRIMARY KEY, service_range_id INTEGER NOT NULL, old_price REAL NOT NULL DEFAULT 0, new_price REAL NOT NULL DEFAULT 0, changed_by INTEGER, note TEXT, changed_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (service_range_id) REFERENCES service_ranges(id) ON DELETE CASCADE, FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS official_book_records (id SERIAL PRIMARY KEY, operation_type TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, organization_id INTEGER, service_id INTEGER, payment_id INTEGER, contract_period_id INTEGER, provider_subscription_id INTEGER, service_range_id INTEGER, provider_price_history_id INTEGER, service_range_history_id INTEGER, official_book_date TEXT NOT NULL, official_book_description TEXT NOT NULL, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL, FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE SET NULL, FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL, FOREIGN KEY (contract_period_id) REFERENCES service_contract_periods(id) ON DELETE SET NULL, FOREIGN KEY (provider_subscription_id) REFERENCES provider_subscriptions(id) ON DELETE SET NULL, FOREIGN KEY (service_range_id) REFERENCES service_ranges(id) ON DELETE SET NULL, FOREIGN KEY (provider_price_history_id) REFERENCES provider_subscription_price_history(id) ON DELETE SET NULL, FOREIGN KEY (service_range_history_id) REFERENCES service_range_price_history(id) ON DELETE SET NULL, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS service_suspensions (id SERIAL PRIMARY KEY, service_id INTEGER NOT NULL, organization_id INTEGER, contract_period_id INTEGER, effective_date TEXT NOT NULL, is_immediate INTEGER NOT NULL DEFAULT 1, refund_amount REAL NOT NULL DEFAULT 0, dropped_due_amount REAL NOT NULL DEFAULT 0, note TEXT, status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'executed', 'cancelled')), executed_at TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (service_id) REFERENCES organization_services(id) ON DELETE CASCADE, FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL, FOREIGN KEY (contract_period_id) REFERENCES service_contract_periods(id) ON DELETE SET NULL, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL)")
    run_sql("CREATE TABLE IF NOT EXISTS app_news (id SERIAL PRIMARY KEY, content TEXT NOT NULL, fetched_at TEXT DEFAULT CURRENT_TIMESTAMP)")

    # Migrations
    _ensure_payments_contract_period_column(cursor)
    _ensure_users_role_column(cursor)
    _ensure_organization_services_columns(cursor)
    _ensure_provider_companies_columns(cursor)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_org_name ON organizations(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_provider_name ON provider_companies(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_org ON organization_services(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_item_service ON service_items(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_service ON payments(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_contract_period ON payments(contract_period_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_ranges_name ON service_ranges(service_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_period_service ON service_contract_periods(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_psh_sub ON provider_subscription_price_history(provider_subscription_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obr_service ON official_book_records(service_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_service_status ON organization_services(service_status)")

    # Seeding defaults only if tables are completely empty
    placeholder = "%s"
    
    cursor.execute("SELECT COUNT(*) as count FROM users")
    row = cursor.fetchone()
    count = row[0] if row and not isinstance(row, dict) else (row.get('count') if row else 0)
    if count == 0:
        cursor.execute(f"INSERT INTO users (username, password, role) VALUES ({placeholder}, {placeholder}, {placeholder})", ('admin1', 'a123', 'admin'))

    cursor.execute("SELECT COUNT(*) FROM provider_companies")
    row = cursor.fetchone()
    count = row[0] if row and not isinstance(row, dict) else (row.get('count') if row else 0)
    if count == 0:
        cursor.executemany(f"INSERT INTO provider_companies (name) VALUES ({placeholder})", [('Huawei',), ('Nokia',), ('ZTE',), ('FiberHome',)])

    _seed_initial_contract_periods_for_existing_services(cursor, is_postgres)
    _link_old_payments_to_first_period(cursor, is_postgres)
    _sync_service_summary_from_active_periods(cursor, is_postgres)

    conn.commit()
    conn.close()
    print(f"✅ Database initialized at: {database_url if database_url else db_path}")

if __name__ == '__main__':
    init_db()