import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_config():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set.")
    return DATABASE_URL, None

class DbWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.is_postgres = True

    def cursor(self):
        return self.conn.cursor(cursor_factory=RealDictCursor)

    def execute(self, sql, params=()):
        sql = sql.replace('?', '%s').replace("datetime('now')", "CURRENT_TIMESTAMP")
        cur = self.cursor()
        if sql.strip().upper().startswith("INSERT") and "RETURNING" not in sql.upper():
            sql = sql.rstrip().rstrip(';') + " RETURNING id"
            cur.execute(sql, params)
            row = cur.fetchone()
            class ResultProxy:
                def __init__(self, c, r_id):
                    self.cursor = c
                    self.lastrowid = r_id
                def __getattr__(self, name): return getattr(self.cursor, name)
            return ResultProxy(cur, row['id'] if row else None)
        cur.execute(sql, params)
        return cur

    def commit(self): self.conn.commit()
    def close(self): self.conn.close()
    def __enter__(self): return self
    def __exit__(self, et, ev, tb):
        if et: self.conn.rollback()
        else: self.conn.commit()
        self.close()

def get_db():
    url, _ = get_config()
    url_to_use = url.replace('pgbouncer=true', '').replace('&&', '&').replace('?&', '?').rstrip('&').rstrip('?')
    try:
        conn = psycopg2.connect(url_to_use, connect_timeout=10)
        with conn.cursor() as cur:
            # تثبيت السكيما لضمان رؤية الجداول فوراً
            cur.execute('SET search_path TO itpc, public;')
        return DbWrapper(conn)
    except Exception as e:
        raise e

def _safe_parse_date(v):
    if not v: return None
    if isinstance(v, (date, datetime)): return v
    try: return datetime.strptime(str(v).split('T')[0], '%Y-%m-%d').date()
    except: return None

def _add_months(base_date, months):
    target_month = base_date.month + months
    year = base_date.year + (target_month - 1) // 12
    month = (target_month - 1) % 12 + 1
    day = min(base_date.day, [31, 29 if year%4==0 and (year%100!=0 or year%400==0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return date(year, month, day)

def _calculate_period_end_date(sd, unit, val):
    start = _safe_parse_date(sd) or date.today()
    val = int(val or 1)
    if unit == "يومي": return start + timedelta(days=val)
    if unit == "سنوي": return _add_months(start, val * 12)
    return _add_months(start, val)

def init_db(): pass