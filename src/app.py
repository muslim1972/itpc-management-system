"""
ITPC Management System — Production Backend (Full Integration)
================================================
Flask + PostgreSQL/SQLite Backend with Static Serving
"""

import os
import sqlite3
import json
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
from database import get_db, init_db, DbWrapper

app = Flask(__name__, static_folder='../dist')
app.config['SECRET_KEY'] = 'itpc-secret-change-in-production'

# Enable CORS (Producing identical behavior to local while allowing Render Origin)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure Database is initialized for Render
try:
    init_db()
except Exception as e:
    print(f"⚠️ Initial DB Seeding Warning: {e}")

dist_path = os.path.join(os.path.dirname(__file__), '..', 'dist')

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-User-Id'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# ── Static File Serving ──────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(dist_path, path)):
        return send_from_directory(dist_path, path)
    return send_from_directory(dist_path, 'index.html')

# ── Health Check ─────────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200

# ── Helpers ──────────────────────────────────────────────────────────────────
def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def parse_date(d_str):
    if not d_str: return None
    for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S'):
        try: return datetime.strptime(d_str.split('T')[0], fmt).date()
        except: continue
    return None

def format_date(d_obj):
    return d_obj.isoformat() if d_obj else None

# ── Database Migration/Failsafe for Render ───────────────────────────────────
def ensure_default_users_exist(conn):
    placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
    default_users = [
        ('admin1', 'a123', 'admin'),
        ('user1', 'u123', 'user'),
        ('ali', '123', 'user'),
        ('ali1', '123', 'admin'),
        ('123', '123', 'user')
    ]
    for un, pw, role in default_users:
        cursor = conn.cursor()
        cursor.execute(f"SELECT id FROM users WHERE username = {placeholder}", (un,))
        if not cursor.fetchone():
            cursor.execute(f"INSERT INTO users (username, password, role) VALUES ({placeholder}, {placeholder}, {placeholder})", (un, pw, role))
    conn.commit()

# ── Auth & Session (Improved for Production) ──────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        with get_db() as conn:
            # دمج التأكد من وجود المستخدمين الافتراضيين مباشرة وبطريقة آمنة
            is_pg = 'postgres' in str(type(conn)).lower() or not hasattr(conn, 'interrupt')
            p = "%s" if is_pg else "?"
            
            cursor = conn.cursor()
            # 1. التأكد من وجود الحسابات الأساسية لضمان عمل حساب ali1
            default_users = [('ali1', '123', 'admin'), ('ali', '123', 'user'), ('123', '123', 'user')]
            for un, pw, role in default_users:
                cursor.execute(f"SELECT id FROM users WHERE username = {p}", (un,))
                if not cursor.fetchone():
                    cursor.execute(f"INSERT INTO users (username, password, role) VALUES ({p}, {p}, {p})", (un, pw, role))
            conn.commit()

            # 2. عملية تسجيل الدخول الحقيقية
            cursor.execute(f"SELECT id, username, role FROM users WHERE username = {p} AND password = {p}", (username, password))
            user = cursor.fetchone()
            
            if user:
                user_dict = dict(user)
                cursor.execute(f"UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = {p}", (user_dict['id'],))
                conn.commit()
                return jsonify({'success': True, 'user': user_dict})
            
        return jsonify({'success': False, 'error': 'اسم المستخدم أو كلمة المرور غير صحيحة'}), 401
    except Exception as e:
        print(f"❌ Login Error: {str(e)}")
        return jsonify({'success': False, 'error': f'خطأ في النظام: {str(e)}'}), 500

# ── Organizations Management ────────────────────────────────────────────────

@app.route('/api/organizations', methods=['GET'])
def get_organizations():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM organizations ORDER BY created_at DESC")
        return jsonify({'organizations': rows_to_list(cursor.fetchall())})

@app.route('/api/organizations', methods=['POST'])
def add_organization():
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"INSERT INTO organizations (name, phone, location, address, status, notes) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", 
                       (data['name'], data.get('phone'), data.get('location'), data.get('address'), data.get('status', 'active'), data.get('notes')))
        conn.commit()
    return jsonify({'success': True}), 201

@app.route('/api/organizations/<int:id>', methods=['PUT'])
def update_organization(id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"UPDATE organizations SET name={placeholder}, phone={placeholder}, location={placeholder}, address={placeholder}, status={placeholder}, notes={placeholder}, updated_at=CURRENT_TIMESTAMP WHERE id={placeholder}",
                       (data['name'], data.get('phone'), data.get('location'), data.get('address'), data.get('status'), data.get('notes'), id))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/organizations/<int:id>', methods=['DELETE'])
def delete_organization(id):
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"DELETE FROM organizations WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/organizations/<int:id>', methods=['GET'])
def get_organization_detail(id):
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"SELECT * FROM organizations WHERE id = {placeholder}", (id,))
        org = row_to_dict(cursor.fetchone())
        if not org: return jsonify({'error': 'Not found'}), 404
        
        cursor.execute(f"SELECT * FROM organization_services WHERE organization_id = {placeholder} ORDER BY created_at DESC", (id,))
        services = rows_to_list(cursor.fetchall())
    return jsonify({'organization': org, 'services': services})

# ── Users Management ─────────────────────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
def get_users():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, last_login, created_at FROM users")
        return jsonify({'users': rows_to_list(cursor.fetchall())})

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"INSERT INTO users (username, password, role) VALUES ({placeholder}, {placeholder}, {placeholder})",
                       (data['username'], data['password'], data.get('role', 'user')))
        conn.commit()
    return jsonify({'success': True}), 201

@app.route('/api/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"DELETE FROM users WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

# ── Provider Companies & Subscriptions ───────────────────────────────────────

@app.route('/api/provider-companies', methods=['GET'])
def get_providers():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM provider_companies ORDER BY name ASC")
        return jsonify({'provider_companies': rows_to_list(cursor.fetchall())})

@app.route('/api/provider-companies', methods=['POST'])
def add_provider():
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"INSERT INTO provider_companies (name, contact_person, phone, email, is_active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", 
                       (data['name'], data.get('contact_person'), data.get('phone'), data.get('email'), data.get('is_active', 1)))
        conn.commit()
    return jsonify({'success': True}), 201

@app.route('/api/provider-companies/<int:id>/subscriptions', methods=['GET'])
def get_provider_subscriptions(id):
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"SELECT * FROM provider_subscriptions WHERE provider_company_id = {placeholder} ORDER BY bundle_name ASC", (id,))
        return jsonify({'subscriptions': rows_to_list(cursor.fetchall())})

@app.route('/api/provider-companies/<int:id>/subscriptions', methods=['POST'])
def add_provider_subscription(id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"""
            INSERT INTO provider_subscriptions (
                provider_company_id, bundle_name, line_type, bundle_type, buy_price, sell_price
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """, (id, data['bundle_name'], data.get('line_type'), data.get('bundle_type'), data['buy_price'], data['sell_price']))
        conn.commit()
    return jsonify({'success': True}), 201

# ── Service Ranges (Global Pricing) ─────────────────────────────────────────

@app.route('/api/service-ranges', methods=['GET'])
def get_service_ranges():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM service_ranges ORDER BY range_label ASC")
        return jsonify({'service_ranges': rows_to_list(cursor.fetchall())})

@app.route('/api/service-ranges', methods=['POST'])
def add_service_range():
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"INSERT INTO service_ranges (range_label, buy_price, sell_price) VALUES ({placeholder}, {placeholder}, {placeholder})",
                       (data['range_label'], data['buy_price'], data['sell_price']))
        conn.commit()
    return jsonify({'success': True}), 201

# ── Organization Services & Payments logic ──────────────────────────────────

@app.route('/api/organizations/<int:org_id>/services', methods=['GET'])
def get_org_services(org_id):
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"SELECT * FROM organization_services WHERE organization_id = {placeholder} ORDER BY created_at DESC", (org_id,))
        return jsonify({'services': rows_to_list(cursor.fetchall())})

@app.route('/api/organizations/<int:org_id>/services', methods=['POST'])
def add_org_service(org_id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"""
            INSERT INTO organization_services (
                organization_id, service_type, payment_method, device_ownership, 
                annual_amount, paid_amount, due_amount, payment_interval_days,
                contract_created_at, contract_duration_unit, contract_duration_value
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """, (
            org_id, data['service_type'], data.get('payment_method', 'شهري'), 
            data.get('device_ownership', 'الشركة'), data['annual_amount'], data['annual_amount'],
            data.get('payment_interval_days', 1), data.get('contract_created_at'),
            data.get('contract_duration_unit', 'شهري'), data.get('contract_duration_value', 1)
        ))
        conn.commit()
    return jsonify({'success': True}), 201

# ── Payments Processing ──────────────────────────────────────────────────────

@app.route('/api/organization-services/<int:service_id>/payments', methods=['POST'])
def add_payment(service_id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        
        # Get active period
        cursor.execute(f"SELECT * FROM service_contract_periods WHERE service_id = {placeholder} AND status = 'active'", (service_id,))
        period = row_to_dict(cursor.fetchone())
        
        if not period:
            return jsonify({'error': 'لا توجد فترة تعاقد نشطة حالياً لهذا الاشتراك'}), 400
            
        amount = float(data['amount'])
        cursor.execute(f"""
            INSERT INTO payments (
                service_id, contract_period_id, amount, payment_date, note, created_by
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """, (service_id, period['id'], amount, data['payment_date'], data.get('note'), data.get('created_by')))
        
        # Update period
        new_paid = float(period['paid_amount'] or 0) + amount
        new_due = float(period['total_amount'] or 0) - new_paid
        cursor.execute(f"UPDATE service_contract_periods SET paid_amount={placeholder}, due_amount={placeholder}, updated_at=CURRENT_TIMESTAMP WHERE id={placeholder}", (new_paid, new_due, period['id']))
        
        # Update service summary
        cursor.execute(f"UPDATE organization_services SET paid_amount = paid_amount + {placeholder}, due_amount = due_amount - {placeholder}, last_payment_amount={placeholder}, last_payment_date={placeholder} WHERE id={placeholder}", 
                       (amount, amount, amount, data['payment_date'], service_id))
        
        conn.commit()
    return jsonify({'success': True}), 201

# ── Dashboard & Statistics ───────────────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_stats():
    with get_db() as conn:
        cursor = conn.cursor()
        stats = {
            'total_organizations': cursor.execute("SELECT COUNT(*) FROM organizations").fetchone()[0],
            'active_services': cursor.execute("SELECT COUNT(*) FROM organization_services WHERE is_active = 1").fetchone()[0],
            'total_payments_count': cursor.execute("SELECT COUNT(*) FROM payments").fetchone()[0],
            'total_due_amount': cursor.execute("SELECT COALESCE(SUM(due_amount), 0) FROM organization_services").fetchone()[0],
        }
        # Recent items
        cursor.execute("SELECT id, name, status, created_at FROM organizations ORDER BY created_at DESC LIMIT 5")
        stats['recent_organizations'] = rows_to_list(cursor.fetchall())
        
        return jsonify(stats), 200

@app.route('/api/history/all', methods=['GET'])
def get_full_history():
    lim = request.args.get('limit', 50, type=int)
    with get_db() as conn:
        cursor = conn.cursor()
        placeholder = "%s" if isinstance(conn, DbWrapper) or 'postgres' in str(type(conn)).lower() else "?"
        cursor.execute(f"SELECT al.*, u.username FROM activity_log al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT {placeholder}", (lim,))
        history = rows_to_list(cursor.fetchall())
    return jsonify({'history': history})

# ── Error Handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'المسار غير موجود'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'خطأ داخلي في السيرفر'}), 500

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 ITPC Production Backend running on port {port}")
    app.run(debug=False, host='0.0.0.0', port=port)