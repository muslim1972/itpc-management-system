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

# Database initialization is now handled manually via SQL script to prevent Vercel timeouts.
# ensure_db_initialized() removed.

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
    
    # In Vercel, static files are handled by rewrites in vercel.json
    # But we keep this for local development compatibility
    if os.path.exists(os.path.join(dist_path, 'index.html')):
        return send_from_directory(dist_path, 'index.html')
    
    return jsonify({"status": "api_ready", "message": "ITPC API is running. Static files should be served by the host."})

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
            
            # عملية تسجيل الدخول החقيقية
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
    try:
        data = request.json or {}
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            
            name = data.get('name')
            if not name:
                return jsonify({'success': False, 'error': 'اسم الجهة مطلوب'}), 400

            cursor.execute(f"INSERT INTO organizations (name, phone, location, address, status, notes) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", 
                           (name, data.get('phone'), data.get('location'), data.get('address'), data.get('status', 'active'), data.get('notes')))
            conn.commit()
        return jsonify({'success': True}), 201
    except Exception as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg or 'already exists' in error_msg.lower():
            error_msg = 'اسم هذه الجهة موجود مسبقاً، يرجى اختيار اسم آخر.'
        print(f"❌ Error adding organization: {str(e)}")
        return jsonify({'success': False, 'error': error_msg}), 500

@app.route('/api/organizations/<int:id>', methods=['PUT'])
def update_organization(id):
    try:
        data = request.json or {}
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            cursor.execute(f"UPDATE organizations SET name={placeholder}, phone={placeholder}, location={placeholder}, address={placeholder}, status={placeholder}, notes={placeholder}, updated_at=CURRENT_TIMESTAMP WHERE id={placeholder}",
                           (data['name'], data.get('phone'), data.get('location'), data.get('address'), data.get('status'), data.get('notes'), id))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg or 'already exists' in error_msg.lower():
            error_msg = 'اسم هذه الجهة موجود مسبقاً، يرجى اختيار اسم آخر.'
        return jsonify({'success': False, 'error': error_msg}), 500

@app.route('/api/organizations/<int:id>', methods=['DELETE'])
def delete_organization(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"DELETE FROM organizations WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/organizations/<int:id>', methods=['GET'])
def get_organization_detail(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
        # 1. Fetch Organization
        cursor.execute(f"SELECT * FROM organizations WHERE id = {placeholder}", (id,))
        org = row_to_dict(cursor.fetchone())
        if not org: return jsonify({'error': 'Not found'}), 404
        
        # 2. Fetch Services
        cursor.execute(f"SELECT * FROM organization_services WHERE organization_id = {placeholder} ORDER BY created_at DESC", (id,))
        services = rows_to_list(cursor.fetchall())
        
        # 3. Enrich Services with Items, Payments, and Periods
        for s in services:
            sid = s['id']
            # Items
            cursor.execute(f"SELECT * FROM service_items WHERE service_id = {placeholder} ORDER BY created_at ASC", (sid,))
            s['service_items'] = rows_to_list(cursor.fetchall())
            
            # Payments
            cursor.execute(f"SELECT p.*, u.username as created_by_username FROM payments p LEFT JOIN users u ON p.created_by = u.id WHERE p.service_id = {placeholder} ORDER BY p.payment_date DESC", (sid,))
            s['payments'] = rows_to_list(cursor.fetchall())
            
            # Active Period
            cursor.execute(f"SELECT * FROM service_contract_periods WHERE service_id = {placeholder} AND status = 'active' LIMIT 1", (sid,))
            s['active_contract_period'] = row_to_dict(cursor.fetchone())
            
            # Closed Periods (History)
            cursor.execute(f"SELECT * FROM service_contract_periods WHERE service_id = {placeholder} AND status != 'active' ORDER BY period_number DESC", (sid,))
            s['closed_contract_periods'] = rows_to_list(cursor.fetchall())
            
            # Latest Suspension info if any
            cursor.execute(f"SELECT * FROM service_suspensions WHERE service_id = {placeholder} ORDER BY created_at DESC LIMIT 1", (sid,))
            s['latest_suspension'] = row_to_dict(cursor.fetchone())

        org['services'] = services

    return jsonify({'organization': org})



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
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"INSERT INTO users (username, password, role) VALUES ({placeholder}, {placeholder}, {placeholder})",
                       (data['username'], data['password'], data.get('role', 'user')))
        conn.commit()
    return jsonify({'success': True}), 201

@app.route('/api/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            cursor.execute(f"DELETE FROM users WHERE id = {placeholder}", (id,))
            rows_deleted = cursor.rowcount
            conn.commit()
            print(f"🗑️ User ID {id} deletion request. Rows deleted: {rows_deleted}")
            if rows_deleted == 0:
                # User was not found or already deleted
                return jsonify({'success': False, 'error': f'المستخدم غير موجود أو تم حذفه مسبقاً. Rows changed: {rows_deleted}'}), 404
        return jsonify({'success': True, 'rows_deleted': rows_deleted})
    except Exception as e:
        print(f"❌ Error deleting user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ── Provider Companies & Subscriptions ───────────────────────────────────────

@app.route('/api/provider-companies', methods=['GET'])
def get_providers():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM provider_companies ORDER BY name ASC")
        return jsonify({'provider_companies': rows_to_list(cursor.fetchall())})

@app.route('/api/provider-companies', methods=['POST'])
def add_provider():
    try:
        data = request.json or {}
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            
            name = data.get('name')
            if not name:
                return jsonify({'success': False, 'error': 'اسم الشركة مطلوب'}), 400

            cursor.execute(f"INSERT INTO provider_companies (name, contact_person, phone, email, address, is_active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", 
                           (name, data.get('contact_person'), data.get('phone'), data.get('email'), data.get('address'), 1 if data.get('is_active') else 0))
            conn.commit()
        return jsonify({'success': True}), 201
    except Exception as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg or 'already exists' in error_msg.lower():
            error_msg = 'اسم الشركة هذا موجود مسبقاً، يرجى اختيار اسم آخر.'
        print(f"❌ Error adding provider: {str(e)}")
        return jsonify({'success': False, 'error': error_msg}), 500

@app.route('/api/provider-companies/<int:id>', methods=['GET'])
def get_provider_detail(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"SELECT * FROM provider_companies WHERE id = {placeholder}", (id,))
        company = row_to_dict(cursor.fetchone())
        if not company: return jsonify({'error': 'Not found'}), 404
        
        cursor.execute(f"SELECT * FROM provider_subscriptions WHERE provider_company_id = {placeholder} ORDER BY item_name ASC", (id,))
        subs = rows_to_list(cursor.fetchall())
        
        # Get price history for each subscription
        for s in subs:
            cursor.execute(f"SELECT * FROM provider_subscription_price_history WHERE provider_subscription_id = {placeholder} ORDER BY changed_at DESC", (s['id'],))
            s['price_history'] = rows_to_list(cursor.fetchall())
            
        company['subscriptions'] = subs
    return jsonify({'provider_company': company})

@app.route('/api/provider-companies/<int:id>', methods=['PUT'])
def update_provider(id):
    data = request.json
    try:
        data = request.json
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            cursor.execute(f"UPDATE provider_companies SET name={placeholder}, contact_person={placeholder}, phone={placeholder}, email={placeholder}, address={placeholder}, is_active={placeholder} WHERE id={placeholder}",
                           (data['name'], data.get('contact_person'), data.get('phone'), data.get('email'), data.get('address'), 1 if data.get('is_active') else 0, id))
            conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg or 'already exists' in error_msg.lower():
            error_msg = 'اسم الشركة هذا موجود مسبقاً، يرجى اختيار اسم آخر.'
        return jsonify({'success': False, 'error': error_msg}), 500

@app.route('/api/provider-companies/<int:id>', methods=['DELETE'])
def delete_provider(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"DELETE FROM provider_companies WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

@app.route('/api/provider-companies/<int:id>/subscriptions', methods=['GET'])
def get_provider_subscriptions(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"SELECT * FROM provider_subscriptions WHERE provider_company_id = {placeholder} ORDER BY item_name ASC", (id,))
        return jsonify({'subscriptions': rows_to_list(cursor.fetchall())})

@app.route('/api/provider-companies/<int:id>/subscriptions', methods=['POST'])
def add_provider_subscription(id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"""
            INSERT INTO provider_subscriptions (
                provider_company_id, item_name, service_type, item_category, price, unit_label
            ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
        """, (id, data.get('item_name', data.get('bundle_name')), data.get('service_type'), data.get('item_category'), data.get('price', data.get('buy_price')), data.get('unit_label')))
        conn.commit()
    return jsonify({'success': True}), 201

@app.route('/api/provider-subscriptions/<int:id>/impact', methods=['POST'])
def get_subscription_impact(id):
    data = request.json
    new_price = float(data.get('price', 0))
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
        # Get subscription info
        cursor.execute(f"SELECT * FROM provider_subscriptions WHERE id = {placeholder}", (id,))
        sub = row_to_dict(cursor.fetchone())
        if not sub: return jsonify({'error': 'Subscription not found'}), 404
        
        # Find affected organizations through service_items
        cursor.execute(f"""
            SELECT o.id as organization_id, o.name as organization_name, COUNT(DISTINCT si.service_id) as affected_services_count
            FROM service_items si
            JOIN organization_services os ON si.service_id = os.id
            JOIN organizations o ON os.organization_id = o.id
            WHERE si.provider_company_id = {placeholder} AND si.item_name = {placeholder}
            GROUP BY o.id, o.name
        """, (sub['provider_company_id'], sub['item_name']))
        
        orgs = rows_to_list(cursor.fetchall())
        
    return jsonify({
        'old_price': sub['price'],
        'new_price': new_price,
        'affected_organizations': orgs
    })

@app.route('/api/provider-subscriptions/<int:id>', methods=['PUT'])
def update_subscription(id):
    data = request.json
    new_price = float(data.get('price', 0))
    selected_org_ids = data.get('selected_organization_ids', [])
    book_date = data.get('official_book_date')
    book_desc = data.get('official_book_description')
    user_id = request.headers.get('X-User-Id')

    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
        # 1. Get current sub
        cursor.execute(f"SELECT * FROM provider_subscriptions WHERE id = {placeholder}", (id,))
        sub = row_to_dict(cursor.fetchone())
        if not sub: return jsonify({'error': 'Not found'}), 404
        
        old_price = sub['price']
        
        # 2. Update the subscription base price
        cursor.execute(f"UPDATE provider_subscriptions SET service_type={placeholder}, item_category={placeholder}, item_name={placeholder}, price={placeholder}, unit_label={placeholder} WHERE id={placeholder}",
                       (data.get('service_type'), data.get('item_category'), data.get('item_name'), new_price, data.get('unit_label'), id))
        
        # 3. Log Price History if changed
        if old_price != new_price:
            cursor.execute(f"INSERT INTO provider_subscription_price_history (provider_subscription_id, old_price, new_price, changed_by, note) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})",
                           (id, old_price, new_price, user_id, f"تعديل السعر - كتاب رسمي: {book_desc}"))
            
            # 4. Impact on organizations
            if selected_org_ids:
                for org_id in selected_org_ids:
                    # Update items
                    cursor.execute(f"""
                        UPDATE service_items 
                        SET unit_price = {placeholder}, total_price = quantity * {placeholder}, updated_at = CURRENT_TIMESTAMP
                        WHERE provider_company_id = {placeholder} AND item_name = {placeholder} 
                        AND service_id IN (SELECT id FROM organization_services WHERE organization_id = {placeholder})
                    """, (new_price, new_price, sub['provider_company_id'], sub['item_name'], org_id))
                    
                    # Log Official Book
                    cursor.execute(f"""
                        INSERT INTO official_book_records (operation_type, entity_type, provider_subscription_id, organization_id, official_book_date, official_book_description, created_by)
                        VALUES ('PRICE_UPDATE', 'subscription', {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    """, (id, org_id, book_date, book_desc, user_id))

                    # Recalculate service totals
                    cursor.execute(f"""
                        UPDATE organization_services 
                        SET annual_amount = (SELECT SUM(total_price) FROM service_items WHERE service_id = organization_services.id),
                            due_amount = (SELECT SUM(total_price) FROM service_items WHERE service_id = organization_services.id) - paid_amount,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE organization_id = {placeholder}
                        AND id IN (SELECT service_id FROM service_items WHERE provider_company_id = {placeholder} AND item_name = {placeholder})
                    """, (org_id, sub['provider_company_id'], sub['item_name']))

        conn.commit()
    return jsonify({'success': True})

@app.route('/api/provider-subscriptions/<int:id>', methods=['DELETE'])
def delete_subscription(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"DELETE FROM provider_subscriptions WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

# ── Service Ranges (Global Pricing) ─────────────────────────────────────────

@app.route('/api/service-ranges', methods=['GET'])
def get_service_ranges():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM service_ranges ORDER BY service_name ASC, range_from ASC")
        return jsonify({'ranges': rows_to_list(cursor.fetchall())})

@app.route('/api/service-ranges', methods=['POST'])
def add_service_range():
    try:
        data = request.json or {}
        with get_db() as conn:
            cursor = conn.cursor()
            is_pg = getattr(conn, 'is_postgres', False)
            placeholder = "%s" if is_pg else "?"
            
            # Using get() and conversion for safety
            service_name = data.get('service_name')
            range_from = int(data.get('range_from') or 0)
            range_to = int(data.get('range_to') or 0)
            price = float(data.get('price') or 0)
            
            if not service_name:
                return jsonify({'success': False, 'error': 'اسم الخدمة مطلوب'}), 400

            cursor.execute(f"INSERT INTO service_ranges (service_name, range_from, range_to, price) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})",
                           (service_name, range_from, range_to, price))
            conn.commit()
        return jsonify({'success': True}), 201
    except Exception as e:
        print(f"❌ Error adding service range: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/service-ranges/<int:id>/impact', methods=['POST'])
def get_range_impact(id):
    data = request.json
    new_price = float(data.get('price', 0))
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
        cursor.execute(f"SELECT * FROM service_ranges WHERE id = {placeholder}", (id,))
        rng = row_to_dict(cursor.fetchone())
        if not rng: return jsonify({'error': 'Range not found'}), 404
        
        # Organizations with services of the same name
        cursor.execute(f"""
            SELECT o.id as organization_id, o.name as organization_name, COUNT(os.id) as services_count, SUM(sic.si_count) as items_count
            FROM organizations o
            JOIN organization_services os ON o.id = os.organization_id
            JOIN (SELECT service_id, COUNT(*) as si_count FROM service_items GROUP BY service_id) sic ON os.id = sic.service_id
            WHERE os.service_type = {placeholder}
            GROUP BY o.id, o.name
        """, (rng['service_name'],))
        
        orgs = rows_to_list(cursor.fetchall())
        
    return jsonify({
        'old_price': rng['price'],
        'new_price': new_price,
        'affected_organizations': orgs
    })

@app.route('/api/service-ranges/<int:id>', methods=['PUT'])
def update_service_range(id):
    data = request.json
    new_price = float(data.get('price', 0))
    selected_org_ids = data.get('selected_organization_ids', [])
    book_date = data.get('official_book_date')
    book_desc = data.get('official_book_description')
    user_id = request.headers.get('X-User-Id')

    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
        cursor.execute(f"SELECT * FROM service_ranges WHERE id = {placeholder}", (id,))
        rng = row_to_dict(cursor.fetchone())
        if not rng: return jsonify({'error': 'Not found'}), 404
        
        old_price = rng['price']
        
        # 1. Update Range
        cursor.execute(f"UPDATE service_ranges SET service_name={placeholder}, range_from={placeholder}, range_to={placeholder}, price={placeholder} WHERE id={placeholder}",
                       (data.get('service_name'), data.get('range_from'), data.get('range_to'), new_price, id))
        
        # 2. Log History
        if old_price != new_price:
            cursor.execute(f"INSERT INTO service_range_price_history (service_range_id, old_price, new_price, changed_by, note) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})",
                           (id, old_price, new_price, user_id, f"تعديل السعر - كتاب رسمي: {book_desc}"))
            
            # 3. Apply to Orgs
            if selected_org_ids:
                for org_id in selected_org_ids:
                    # Update items belonging to services of this type
                    cursor.execute(f"""
                        UPDATE service_items 
                        SET unit_price = {placeholder}, total_price = quantity * {placeholder}, updated_at = CURRENT_TIMESTAMP
                        WHERE service_id IN (SELECT id FROM organization_services WHERE organization_id = {placeholder} AND service_type = {placeholder})
                    """, (new_price, new_price, org_id, rng['service_name']))
                    
                    # Official Book
                    cursor.execute(f"""
                        INSERT INTO official_book_records (operation_type, entity_type, service_range_id, organization_id, official_book_date, official_book_description, created_by)
                        VALUES ('RANGE_UPDATE', 'range', {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    """, (id, org_id, book_date, book_desc, user_id))

                    # Update organization_services summary
                    cursor.execute(f"""
                        UPDATE organization_services 
                        SET annual_amount = (SELECT SUM(total_price) FROM service_items WHERE service_id = organization_services.id),
                            due_amount = (SELECT SUM(total_price) FROM service_items WHERE service_id = organization_services.id) - paid_amount,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE organization_id = {placeholder} AND service_type = {placeholder}
                    """, (org_id, rng['service_name']))

        conn.commit()
    return jsonify({'success': True})

@app.route('/api/service-ranges/<int:id>', methods=['DELETE'])
def delete_service_range(id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"DELETE FROM service_ranges WHERE id = {placeholder}", (id,))
        conn.commit()
    return jsonify({'success': True})

# ── Organization Services & Payments logic ──────────────────────────────────

@app.route('/api/organizations/<int:org_id>/services', methods=['GET'])
def get_org_services(org_id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"SELECT * FROM organization_services WHERE organization_id = {placeholder} ORDER BY created_at DESC", (org_id,))
        return jsonify({'services': rows_to_list(cursor.fetchall())})

def calculate_contract_total_py(base_monthly, unit, value):
    base = float(base_monthly or 0)
    val = int(value or 1)
    if unit == 'يومي': return (base / 30.0) * val
    if unit == 'شهري': return base * val
    if unit == 'سنوي': return base * 12.0 * val
    return base

@app.route('/api/organizations/<int:org_id>/services', methods=['POST'])
def add_org_service(org_id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"

        service_type = data['service_type']
        payment_method = data.get('payment_method', 'شهري')
        annual_amount = float(data.get('annual_amount', 0))
        duration_unit = data.get('contract_duration_unit', 'شهري')
        duration_value = int(data.get('contract_duration_value', 1))
        created_at_str = data.get('contract_created_at') or datetime.now().strftime('%Y-%m-%d')
        
        # Calculate End Date for the first period
        start_date = parse_date(created_at_str) or date.today()
        if duration_unit == 'يومي': end_date = start_date + timedelta(days=duration_value)
        elif duration_unit == 'شهري': 
            # Simple month add
            end_date = (start_date + timedelta(days=duration_value * 30)) # Approximation for first period
        elif duration_unit == 'سنوي': end_date = start_date + timedelta(days=duration_value * 365)
        else: end_date = start_date + timedelta(days=30)

        if is_pg:
            cursor.execute(f"""
                INSERT INTO organization_services (
                    organization_id, service_type, payment_method, device_ownership, 
                    annual_amount, paid_amount, due_amount, payment_interval_days,
                    contract_created_at, contract_duration_unit, contract_duration_value, due_date,
                    official_book_date, official_book_description
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                RETURNING *
            """, (
                org_id, service_type, payment_method, 
                data.get('device_ownership', 'الشركة'), annual_amount, annual_amount,
                data.get('payment_interval_days', 1), created_at_str,
                duration_unit, duration_value, end_date.isoformat(),
                data.get('official_book_date'), data.get('official_book_description')
            ))
            service = row_to_dict(cursor.fetchone())
        else:
            cursor.execute(f"""
                INSERT INTO organization_services (
                    organization_id, service_type, payment_method, device_ownership, 
                    annual_amount, paid_amount, due_amount, payment_interval_days,
                    contract_created_at, contract_duration_unit, contract_duration_value, due_date,
                    official_book_date, official_book_description
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
            """, (
                org_id, service_type, payment_method, 
                data.get('device_ownership', 'الشركة'), annual_amount, annual_amount,
                data.get('payment_interval_days', 1), created_at_str,
                duration_unit, duration_value, end_date.isoformat(),
                data.get('official_book_date'), data.get('official_book_description')
            ))
            new_id = cursor.lastrowid
            cursor.execute(f"SELECT * FROM organization_services WHERE id = {placeholder}", (new_id,))
            service = row_to_dict(cursor.fetchone())


        # Create Initial Contract Period
        if service:
            cursor.execute(f"""
                INSERT INTO service_contract_periods (
                    service_id, period_number, period_label, start_date, end_date,
                    contract_duration_unit, contract_duration_value, payment_method,
                    base_amount, carried_debt, total_amount, paid_amount, due_amount,
                    status, created_at, updated_at
                ) VALUES ({placeholder}, 1, 'الفترة 1', {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, 0, {placeholder}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                service['id'], start_date.isoformat(), end_date.isoformat(),
                duration_unit, duration_value, payment_method,
                annual_amount, annual_amount, annual_amount
            ))

        conn.commit()
    return jsonify({'success': True, 'service': service}), 201

# ── App News ──────────────────────────────────────────────────────────────

@app.route('/api/news', methods=['GET'])
def get_news():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT content FROM app_news ORDER BY fetched_at DESC LIMIT 1")
        row = cursor.fetchone()
        return jsonify({'news': row['content'] if row else ''})

@app.route('/api/news', methods=['POST'])
def save_news():
    data = request.json
    content = data.get('content', '')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM app_news")
        is_pg = 'postgres' in str(type(conn)).lower() or not hasattr(conn, 'interrupt')
        p = "%s" if is_pg else "?"
        cursor.execute(f"INSERT INTO app_news (content) VALUES ({p})", (content,))
        conn.commit()
    return jsonify({'success': True})

# ── Service Items ────────────────────────────────────────────────────────────

@app.route('/api/organization-services/<int:service_id>/items', methods=['GET'])
def get_service_items(service_id):
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        cursor.execute(f"SELECT * FROM service_items WHERE service_id = {placeholder} ORDER BY created_at ASC", (service_id,))
        return jsonify({'service_items': rows_to_list(cursor.fetchall())})

@app.route('/api/organization-services/<int:service_id>/items', methods=['POST'])
def add_service_item(service_id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"

        quantity = float(data.get('quantity', 1))
        unit_price = float(data.get('unit_price', 0))
        total_price = quantity * unit_price

        if is_pg:
            cursor.execute(f"""
                INSERT INTO service_items (
                    service_id, item_category, provider_company_id, item_name,
                    line_type, bundle_type, quantity, unit_price, total_price, notes
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                RETURNING *
            """, (
                service_id, data.get('item_category', 'Other'),
                data.get('provider_company_id') or None, data.get('item_name', ''),
                data.get('line_type'), data.get('bundle_type'),
                quantity, unit_price, total_price, data.get('notes', '')
            ))
            service_item = row_to_dict(cursor.fetchone())
        else:
            cursor.execute(f"""
                INSERT INTO service_items (
                    service_id, item_category, provider_company_id, item_name,
                    line_type, bundle_type, quantity, unit_price, total_price, notes
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
            """, (
                service_id, data.get('item_category', 'Other'),
                data.get('provider_company_id') or None, data.get('item_name', ''),
                data.get('line_type'), data.get('bundle_type'),
                quantity, unit_price, total_price, data.get('notes', '')
            ))
            new_id = cursor.lastrowid
            cursor.execute(f"SELECT * FROM service_items WHERE id = {placeholder}", (new_id,))
            service_item = row_to_dict(cursor.fetchone())

        # Update parent service totals
        cursor.execute(f"SELECT COALESCE(SUM(total_price), 0) as total FROM service_items WHERE service_id = {placeholder}", (service_id,))
        row = cursor.fetchone()
        monthly_sum = row['total'] if isinstance(row, dict) else row[0]

        cursor.execute(f"SELECT contract_duration_unit, contract_duration_value FROM organization_services WHERE id = {placeholder}", (service_id,))
        svc_info = row_to_dict(cursor.fetchone())
        
        if svc_info:
            dur_unit = svc_info['contract_duration_unit']
            dur_val = svc_info['contract_duration_value']
            
            # 2. Calculate new monthly sum from items
            cursor.execute(f"SELECT COALESCE(SUM(total_price), 0) as total FROM service_items WHERE service_id = {placeholder}", (service_id,))
            res = cursor.fetchone()
            monthly_sum = float(res['total'] if isinstance(res, dict) else res[0])
            
            # 3. Calculate new total contract amount
            new_contract_total = calculate_contract_total_py(monthly_sum, dur_unit, dur_val)
            
            # 4. Update the organization_services
            cursor.execute(f"""
                UPDATE organization_services 
                SET annual_amount = {placeholder},
                    due_amount = {placeholder} - COALESCE(paid_amount, 0),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = {placeholder}
            """, (new_contract_total, new_contract_total, service_id))
            
            # 5. Update the active contract period
            cursor.execute(f"""
                UPDATE service_contract_periods
                SET base_amount = {placeholder},
                    total_amount = {placeholder},
                    due_amount = {placeholder} - COALESCE(paid_amount, 0),
                    updated_at = CURRENT_TIMESTAMP
                WHERE service_id = {placeholder} AND status = 'active'
            """, (new_contract_total, new_contract_total, new_contract_total, service_id))

        conn.commit()

    return jsonify({'success': True, 'service_item': service_item}), 201

# ── Payments Processing ──────────────────────────────────────────────────────

@app.route('/api/organization-services/<int:service_id>/payments', methods=['POST'])
def add_payment(service_id):
    data = request.json
    with get_db() as conn:
        cursor = conn.cursor()
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
        
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
        is_pg = getattr(conn, 'is_postgres', False)
        placeholder = "%s" if is_pg else "?"
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