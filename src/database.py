import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date, timedelta

# 1. جلب الإعدادات مرة واحدة عند تشغيل السيرفر وليس في كل طلب
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_config():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set.")
    return DATABASE_URL, None

# 2. مغلف قاعدة البيانات (حافظنا على منطقك مع تسريعه)
class DbWrapper:
    def __init__(self, conn):
        self.conn = conn

    def execute(self, sql, params=()):
        # استبدال العلامات كما في كودك ولكن بشكل أسرع
        sql = sql.replace('?', '%s').replace("datetime('now')", "CURRENT_TIMESTAMP")
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        
        # منطق الـ ID لعمليات الإضافة (ضروري جداً لتطبيقك)
        if sql.strip().upper().startswith("INSERT") and "RETURNING" not in sql.upper():
            sql = sql.rstrip().rstrip(';') + " RETURNING id"
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                # محاكاة بسيطة للـ lastrowid
                class ResultProxy:
                    def __init__(self, c, r_id):
                        self.cursor = c
                        self.lastrowid = r_id
                    def __getattr__(self, name): return getattr(self.cursor, name)
                return ResultProxy(cursor, row['id'])
        
        cursor.execute(sql, params)
        return cursor

    def commit(self): self.conn.commit()
    def close(self): self.conn.close()
    def __enter__(self): return self
    def __exit__(self, et, ev, tb):
        if et: self.conn.rollback()
        else: self.conn.commit()
        self.close()

# 3. دالة الاتصال الذكية (سر السرعة)
def get_db():
    url, _ = get_config()
    
    # تحسين الرابط ليدخل لسكيما itpc فوراً ويدعم pgbouncer
    if 'options=' not in url:
        sep = '&' if '?' in url else '?'
        url += f"{sep}options=-csearch_path%3Ditpc,public&sslmode=require&connect_timeout=5"
    
    try:
        # اتصال واحد مباشر وسريع
        conn = psycopg2.connect(url)
        return DbWrapper(conn)
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        raise e

# 4. المساعدات (Helpers) التي يحتاجها تطبيقك في app.py
def _safe_parse_date(value):
    if not value: return None
    if isinstance(value, (date, datetime)): return value
    for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try: return datetime.strptime(str(value).split('T')[0], fmt).date()
        except: continue
    return None

def _add_months(base_date, months):
    target_month = base_date.month + months
    year = base_date.year + (target_month - 1) // 12
    month = (target_month - 1) % 12 + 1
    day = min(base_date.day, [31, 29 if year%4==0 and (year%100!=0 or year%400==0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return date(year, month, day)

def _calculate_period_end_date(start_date, unit, val):
    start = _safe_parse_date(start_date) or date.today()
    val = int(val or 1)
    if unit == "يومي": return start + timedelta(days=val)
    if unit == "سنوي": return _add_months(start, val * 12)
    return _add_months(start, val) # الافتراضي شهري