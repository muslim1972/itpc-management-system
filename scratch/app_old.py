"""
ITPC Management System — Flask + SQLite Backend
================================================
Run:  python app.py
API base: http://localhost:5000/api

Schema: users, organizations, provider_companies, provider_subscriptions,
        organization_services, service_items, payments, activity_log
"""

from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
from flask_cors import CORS
from database import get_db, init_db, DATABASE_URL

app = Flask(__name__, static_folder='../dist', static_url_path='/')
CORS(app)
app.config['SECRET_KEY'] = 'itpc-secret-change-in-production'

# ── Production Frontend Serving ──────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    if not request.path.startswith('/api'):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify(error=str(e)), 404

# ── CORS headers ─────────────────────────────────────────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return jsonify({}), 200


# ── Helpers ───────────────────────────────────────────────────────────────────
def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def log_action(conn, user_id, action, entity_type=None, entity_id=None, details=None):
    conn.execute(
        "INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)",
        (user_id, action, entity_type, entity_id, details)
    )

def normalize_device_ownership(value):
    value = (value or '').strip()
    mapping = {
        'ايجار': 'الشركة',
        'مدفوع الثمن': 'المنظمة',
        'الشركة': 'الشركة',
        'المنظمة': 'المنظمة',
        'الوزارة': 'الوزارة',
    }
    return mapping.get(value, value)


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Body: { "username": "user1", "password": "u123" }
    """
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400

    conn = get_db()
    user = row_to_dict(conn.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        (data['username'], data['password'])
    ).fetchone())

    if not user:
        conn.close()
        return jsonify({'error': 'Invalid username or password'}), 401

    conn.execute("UPDATE users SET last_login = datetime('now') WHERE id = ?", (user['id'],))
    log_action(conn, user['id'], f"User '{user['username']}' logged in")
    conn.commit()
    conn.close()

    user.pop('password', None)
    return jsonify({'message': 'Login successful', 'user': user}), 200


# ══════════════════════════════════════════════════════════════════════════════
# ORGANIZATIONS (CRUD)
# ══════════════════════════════════════════════════════════════════════════════

VALID_ORG_STATUS = ('active', 'inactive', 'pending')

@app.route('/api/organizations', methods=['GET'])
def get_organizations():
    """
    GET /api/organizations?search=...&status=active
    """
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()

    query = "SELECT * FROM organizations WHERE 1=1"
    params = []
    if search:
        query += " AND (name LIKE ? OR phone LIKE ? OR address LIKE ? OR location LIKE ?)"
        p = f'%{search}%'
        params.extend([p, p, p, p])
    if status and status in VALID_ORG_STATUS:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY name ASC"

    conn = get_db()
    orgs = rows_to_list(conn.execute(query, params).fetchall())
    conn.close()
    return jsonify({'organizations': orgs, 'count': len(orgs)}), 200


@app.route('/api/organizations/<int:org_id>', methods=['GET'])
def get_organization(org_id):
    """
    GET /api/organizations/:id — Full details with services, service_items, payments.
    """
    conn = get_db()
    org = row_to_dict(conn.execute(
        "SELECT * FROM organizations WHERE id = ?", (org_id,)
    ).fetchone())
    if not org:
        conn.close()
        return jsonify({'error': 'Organization not found'}), 404

    services = rows_to_list(conn.execute(
        "SELECT * FROM organization_services WHERE organization_id = ? ORDER BY id",
        (org_id,)
    ).fetchall())

    for svc in services:
        svc_id = svc['id']
        svc['service_items'] = rows_to_list(conn.execute(
            """SELECT si.*, pc.name AS provider_company_name
               FROM service_items si
               LEFT JOIN provider_companies pc ON si.provider_company_id = pc.id
               WHERE si.service_id = ? ORDER BY si.id""",
            (svc_id,)
        ).fetchall())
        svc['payments'] = rows_to_list(conn.execute(
            """SELECT p.*, u.username AS created_by_username
               FROM payments p
               LEFT JOIN users u ON p.created_by = u.id
               WHERE p.service_id = ? ORDER BY p.payment_date DESC""",
            (svc_id,)
        ).fetchall())

    conn.close()
    org['services'] = services
    return jsonify({'organization': org}), 200


@app.route('/api/organizations', methods=['POST'])
def create_organization():
    """
    POST /api/organizations
    Body: { "name", "phone", "address", "location", "status", "notes" }
    """
    data = request.get_json()
    if not data or not data.get('name') or not str(data.get('name', '')).strip():
        return jsonify({'error': 'Name is required'}), 400

    status = data.get('status', 'active')
    if status not in VALID_ORG_STATUS:
        return jsonify({'error': f'status must be one of {VALID_ORG_STATUS}'}), 400

    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO organizations (name, phone, address, location, status, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                str(data['name']).strip(),
                data.get('phone'),
                data.get('address'),
                data.get('location'),
                status,
                data.get('notes')
            )
        )
        org_id = cursor.lastrowid
        log_action(conn, None, f"Created organization {str(data['name']).strip()}",
                   entity_type='organization', entity_id=org_id)
        conn.commit()
        org = row_to_dict(conn.execute(
            "SELECT * FROM organizations WHERE id = ?", (org_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'Organization created', 'organization': org}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Organization name already exists'}), 409


@app.route('/api/organizations/<int:org_id>', methods=['PUT'])
def update_organization(org_id):
    """PUT /api/organizations/:id"""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        "SELECT * FROM organizations WHERE id = ?", (org_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Organization not found'}), 404

    status = data.get('status', existing['status'])
    if status not in VALID_ORG_STATUS:
        conn.close()
        return jsonify({'error': f'status must be one of {VALID_ORG_STATUS}'}), 400

    conn.execute(
        """UPDATE organizations SET
               name=?, phone=?, address=?, location=?, status=?, notes=?,
               updated_at = datetime('now')
           WHERE id = ?""",
        (
            data.get('name', existing['name']),
            data.get('phone', existing['phone']),
            data.get('address', existing['address']),
            data.get('location', existing['location']),
            status,
            data.get('notes', existing['notes']),
            org_id
        )
    )
    log_action(conn, None, f"Updated organization {org_id}",
               entity_type='organization', entity_id=org_id)
    conn.commit()
    org = row_to_dict(conn.execute(
        "SELECT * FROM organizations WHERE id = ?", (org_id,)
    ).fetchone())
    conn.close()
    return jsonify({'message': 'Organization updated', 'organization': org}), 200


@app.route('/api/organizations/<int:org_id>', methods=['DELETE'])
def delete_organization(org_id):
    """DELETE /api/organizations/:id — Hard delete (CASCADE)."""
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM organizations WHERE id = ?", (org_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Organization not found'}), 404
    conn.execute("DELETE FROM organizations WHERE id = ?", (org_id,))
    log_action(conn, None, f"Deleted organization {org_id}",
               entity_type='organization', entity_id=org_id)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Organization deleted'}), 200


# ══════════════════════════════════════════════════════════════════════════════
# PROVIDER COMPANIES (CRUD)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/provider-companies', methods=['GET'])
def get_provider_companies():
    """GET /api/provider-companies?active=1"""
    active = request.args.get('active')
    query = "SELECT * FROM provider_companies WHERE 1=1"
    params = []
    if active is not None:
        query += " AND is_active = ?"
        params.append(1 if str(active).lower() in ('1', 'true', 'yes') else 0)
    query += " ORDER BY name ASC"

    conn = get_db()
    companies = rows_to_list(conn.execute(query, params).fetchall())
    conn.close()
    return jsonify({'provider_companies': companies, 'count': len(companies)}), 200


@app.route('/api/provider-companies/<int:company_id>', methods=['GET'])
def get_provider_company(company_id):
    """GET /api/provider-companies/:id with subscriptions."""
    conn = get_db()
    company = row_to_dict(conn.execute(
        "SELECT * FROM provider_companies WHERE id = ?", (company_id,)
    ).fetchone())
    if not company:
        conn.close()
        return jsonify({'error': 'Provider company not found'}), 404

    company['subscriptions'] = rows_to_list(conn.execute(
        "SELECT * FROM provider_subscriptions WHERE provider_company_id = ? ORDER BY id",
        (company_id,)
    ).fetchall())
    conn.close()
    return jsonify({'provider_company': company}), 200


@app.route('/api/provider-companies', methods=['POST'])
def create_provider_company():
    """
    POST /api/provider-companies
    Body: { "name", "phone", "address", "email", "is_active" }
    """
    data = request.get_json()
    if not data or not data.get('name') or not str(data.get('name', '')).strip():
        return jsonify({'error': 'Name is required'}), 400

    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO provider_companies (name, phone, address, email, is_active)
               VALUES (?, ?, ?, ?, ?)""",
            (
                str(data['name']).strip(),
                data.get('phone'),
                data.get('address'),
                data.get('email'),
                1 if data.get('is_active', True) else 0
            )
        )
        company_id = cursor.lastrowid
        log_action(conn, None, f"Created provider company {str(data['name']).strip()}",
                   entity_type='provider_company', entity_id=company_id)
        conn.commit()
        company = row_to_dict(conn.execute(
            "SELECT * FROM provider_companies WHERE id = ?", (company_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'Provider company created', 'provider_company': company}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Provider company name already exists'}), 409


@app.route('/api/provider-companies/<int:company_id>', methods=['PUT'])
def update_provider_company(company_id):
    """PUT /api/provider-companies/:id"""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        "SELECT * FROM provider_companies WHERE id = ?", (company_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Provider company not found'}), 404

    is_active = data.get('is_active')
    if is_active is not None:
        is_active = 1 if is_active else 0
    else:
        is_active = existing['is_active']

    conn.execute(
        """UPDATE provider_companies SET
               name=?, phone=?, address=?, email=?, is_active=?
           WHERE id = ?""",
        (
            data.get('name', existing['name']),
            data.get('phone', existing['phone']),
            data.get('address', existing['address']),
            data.get('email', existing['email']),
            is_active,
            company_id
        )
    )
    log_action(conn, None, f"Updated provider company {company_id}",
               entity_type='provider_company', entity_id=company_id)
    conn.commit()
    company = row_to_dict(conn.execute(
        "SELECT * FROM provider_companies WHERE id = ?", (company_id,)
    ).fetchone())
    conn.close()
    return jsonify({'message': 'Provider company updated', 'provider_company': company}), 200


@app.route('/api/provider-companies/<int:company_id>', methods=['DELETE'])
def delete_provider_company(company_id):
    """DELETE /api/provider-companies/:id — Hard delete (CASCADE)."""
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM provider_companies WHERE id = ?", (company_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Provider company not found'}), 404
    conn.execute("DELETE FROM provider_companies WHERE id = ?", (company_id,))
    log_action(conn, None, f"Deleted provider company {company_id}",
               entity_type='provider_company', entity_id=company_id)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Provider company deleted'}), 200


# ══════════════════════════════════════════════════════════════════════════════
# PROVIDER SUBSCRIPTIONS (CRUD)
# ══════════════════════════════════════════════════════════════════════════════

VALID_SERVICE_TYPE = ('Wireless', 'FTTH', 'Optical', 'Other')
VALID_ITEM_CATEGORY = ('Line', 'Bundle', 'Other')

@app.route('/api/provider-companies/<int:company_id>/subscriptions', methods=['GET'])
def get_provider_subscriptions(company_id):
    """GET /api/provider-companies/:id/subscriptions"""
    conn = get_db()
    subs = rows_to_list(conn.execute(
        "SELECT * FROM provider_subscriptions WHERE provider_company_id = ? ORDER BY id",
        (company_id,)
    ).fetchall())
    conn.close()
    return jsonify({'subscriptions': subs, 'count': len(subs)}), 200


@app.route('/api/provider-companies/<int:company_id>/subscriptions', methods=['POST'])
def create_provider_subscription(company_id):
    """
    POST /api/provider-companies/:id/subscriptions
    Body: { "service_type", "item_category", "item_name", "price", "unit_label" }
    """
    data = request.get_json()
    if not data or not data.get('service_type') or not data.get('item_category') or not data.get('item_name'):
        return jsonify({'error': 'service_type, item_category, and item_name are required'}), 400
    if data.get('service_type') not in VALID_SERVICE_TYPE:
        return jsonify({'error': f'service_type must be one of {VALID_SERVICE_TYPE}'}), 400
    if data.get('item_category') not in VALID_ITEM_CATEGORY:
        return jsonify({'error': f'item_category must be one of {VALID_ITEM_CATEGORY}'}), 400

    conn = get_db()
    if not conn.execute("SELECT id FROM provider_companies WHERE id = ?", (company_id,)).fetchone():
        conn.close()
        return jsonify({'error': 'Provider company not found'}), 404

    try:
        cursor = conn.execute(
            """INSERT INTO provider_subscriptions
               (provider_company_id, service_type, item_category, item_name, price, unit_label)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                company_id,
                data['service_type'],
                data['item_category'],
                data['item_name'],
                float(data.get('price', 0)),
                data.get('unit_label')
            )
        )
        sub_id = cursor.lastrowid
        log_action(conn, None, f"Created subscription {data['item_name']}",
                   entity_type='provider_subscription', entity_id=sub_id,
                   details=f"company_id={company_id}, service_type={data['service_type']}, item_category={data['item_category']}")
        conn.commit()
        sub = row_to_dict(conn.execute(
            "SELECT * FROM provider_subscriptions WHERE id = ?", (sub_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'Subscription created', 'subscription': sub}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/provider-subscriptions/<int:sub_id>', methods=['PUT'])
def update_provider_subscription(sub_id):
    """PUT /api/provider-subscriptions/:id"""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        "SELECT * FROM provider_subscriptions WHERE id = ?", (sub_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Subscription not found'}), 404

    st = data.get('service_type', existing['service_type'])
    ic = data.get('item_category', existing['item_category'])
    if st not in VALID_SERVICE_TYPE or ic not in VALID_ITEM_CATEGORY:
        conn.close()
        return jsonify({'error': 'Invalid service_type or item_category'}), 400

    conn.execute(
        """UPDATE provider_subscriptions SET
               service_type=?, item_category=?, item_name=?, price=?, unit_label=?
           WHERE id = ?""",
        (
            st, ic,
            data.get('item_name', existing['item_name']),
            float(data.get('price', existing['price'])),
            data.get('unit_label', existing['unit_label']),
            sub_id
        )
    )
    log_action(conn, None, f"Updated subscription {sub_id}",
               entity_type='provider_subscription', entity_id=sub_id)
    conn.commit()
    sub = row_to_dict(conn.execute(
        "SELECT * FROM provider_subscriptions WHERE id = ?", (sub_id,)
    ).fetchone())
    conn.close()
    return jsonify({'message': 'Subscription updated', 'subscription': sub}), 200


@app.route('/api/provider-subscriptions/<int:sub_id>', methods=['DELETE'])
def delete_provider_subscription(sub_id):
    """DELETE /api/provider-subscriptions/:id"""
    conn = get_db()
    conn.execute("DELETE FROM provider_subscriptions WHERE id = ?", (sub_id,))
    if conn.total_changes == 0:
        conn.close()
        return jsonify({'error': 'Subscription not found'}), 404
    log_action(conn, None, f"Deleted subscription {sub_id}",
               entity_type='provider_subscription', entity_id=sub_id)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Subscription deleted'}), 200


# ══════════════════════════════════════════════════════════════════════════════
# ORGANIZATION SERVICES (CRUD)
# ══════════════════════════════════════════════════════════════════════════════

VALID_PAYMENT_METHOD = ('شهري', 'كل 3 أشهر', 'سنوي')
VALID_DEVICE_OWNERSHIP = ('الشركة', 'المنظمة', 'الوزارة')

@app.route('/api/organizations/<int:org_id>/services', methods=['POST'])
def create_organization_service(org_id):
    """
    POST /api/organizations/:id/services
    Body: service_type, payment_method, device_ownership, annual_amount, due_date, notes
    """
    data = request.get_json()
    if not data or not data.get('service_type'):
        return jsonify({'error': 'service_type is required'}), 400
    if data.get('service_type') not in VALID_SERVICE_TYPE:
        return jsonify({'error': f'service_type must be one of {VALID_SERVICE_TYPE}'}), 400

    pm = data.get('payment_method', 'شهري')
    do = normalize_device_ownership(data.get('device_ownership', 'الشركة'))
    if pm not in VALID_PAYMENT_METHOD or do not in VALID_DEVICE_OWNERSHIP:
        return jsonify({'error': 'Invalid payment_method or device_ownership'}), 400

    conn = get_db()
    if not conn.execute("SELECT id FROM organizations WHERE id = ?", (org_id,)).fetchone():
        conn.close()
        return jsonify({'error': 'Organization not found'}), 404

    annual = float(data.get('annual_amount', 0))
    try:
        cursor = conn.execute(
            """INSERT INTO organization_services
               (organization_id, service_type, payment_method, device_ownership,
                annual_amount, due_amount, due_date, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (org_id, data['service_type'], pm, do, annual, annual, data.get('due_date'), data.get('notes'))
        )
        svc_id = cursor.lastrowid

        log_action(
            conn,
            None,
            f"Created service {data['service_type']}",
            entity_type='organization_service',
            entity_id=svc_id,
            details=f'organization_id={org_id}, annual_amount={annual}'
        )

        conn.commit()
        svc = row_to_dict(conn.execute(
            "SELECT * FROM organization_services WHERE id = ?", (svc_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'Service created', 'service': svc}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/organization-services/<int:svc_id>', methods=['PUT'])
def update_organization_service(svc_id):
    """PUT /api/organization-services/:id"""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        "SELECT * FROM organization_services WHERE id = ?", (svc_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Service not found'}), 404

    pm = data.get('payment_method', existing['payment_method'])
    do = normalize_device_ownership(data.get('device_ownership', existing['device_ownership']))
    if pm not in VALID_PAYMENT_METHOD or do not in VALID_DEVICE_OWNERSHIP:
        conn.close()
        return jsonify({'error': 'Invalid payment_method or device_ownership'}), 400

    conn.execute(
        """UPDATE organization_services SET
               service_type=?, payment_method=?, device_ownership=?,
               annual_amount=?, due_date=?, notes=?, is_active=?,
               updated_at = datetime('now')
           WHERE id = ?""",
        (
            data.get('service_type', existing['service_type']),
            pm, do,
            float(data.get('annual_amount', existing['annual_amount'])),
            data.get('due_date', existing['due_date']),
            data.get('notes', existing['notes']),
            1 if data.get('is_active', existing['is_active']) else 0,
            svc_id
        )
    )
    log_action(conn, None, f"Updated service {svc_id}",
               entity_type='organization_service', entity_id=svc_id)
    conn.commit()
    svc = row_to_dict(conn.execute(
        "SELECT * FROM organization_services WHERE id = ?", (svc_id,)
    ).fetchone())
    conn.close()
    return jsonify({'message': 'Service updated', 'service': svc}), 200


@app.route('/api/organization-services/<int:svc_id>', methods=['DELETE'])
def delete_organization_service(svc_id):
    """DELETE /api/organization-services/:id"""
    conn = get_db()
    conn.execute("DELETE FROM organization_services WHERE id = ?", (svc_id,))
    if conn.total_changes == 0:
        conn.close()
        return jsonify({'error': 'Service not found'}), 404
    log_action(conn, None, f"Deleted service {svc_id}",
               entity_type='organization_service', entity_id=svc_id)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Service deleted'}), 200


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE ITEMS (CRUD)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/organization-services/<int:svc_id>/items', methods=['POST'])
def create_service_item(svc_id):
    """
    POST /api/organization-services/:id/items
    Body: item_category, provider_company_id, item_name, line_type, bundle_type,
          quantity, unit_price, notes
    """
    data = request.get_json()
    if not data or not data.get('item_category') or not data.get('item_name'):
        return jsonify({'error': 'item_category and item_name are required'}), 400
    if data.get('item_category') not in VALID_ITEM_CATEGORY:
        return jsonify({'error': f'item_category must be one of {VALID_ITEM_CATEGORY}'}), 400

    conn = get_db()
    if not conn.execute("SELECT id FROM organization_services WHERE id = ?", (svc_id,)).fetchone():
        conn.close()
        return jsonify({'error': 'Service not found'}), 404

    qty = float(data.get('quantity', 1))
    up = float(data.get('unit_price', 0))
    total = qty * up
    try:
        cursor = conn.execute(
            """INSERT INTO service_items
               (service_id, item_category, provider_company_id, item_name,
                line_type, bundle_type, quantity, unit_price, total_price, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                svc_id,
                data['item_category'],
                data.get('provider_company_id') or None,
                data.get('item_name'),
                data.get('line_type'),
                data.get('bundle_type'),
                qty, up, total,
                data.get('notes')
            )
        )
        item_id = cursor.lastrowid

        log_action(
            conn,
            None,
            f"Created service item {data.get('item_name')}",
            entity_type='service_item',
            entity_id=item_id,
            details=f'service_id={svc_id}, category={data["item_category"]}, quantity={qty}, unit_price={up}'
        )

        conn.commit()
        item = row_to_dict(conn.execute(
            "SELECT * FROM service_items WHERE id = ?", (item_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'Service item created', 'service_item': item}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/service-items/<int:item_id>', methods=['PUT'])
def update_service_item(item_id):
    """PUT /api/service-items/:id"""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute(
        "SELECT * FROM service_items WHERE id = ?", (item_id,)
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Service item not found'}), 404

    ic = data.get('item_category', existing['item_category'])
    if ic not in VALID_ITEM_CATEGORY:
        conn.close()
        return jsonify({'error': f'item_category must be one of {VALID_ITEM_CATEGORY}'}), 400

    qty = float(data.get('quantity', existing['quantity']))
    up = float(data.get('unit_price', existing['unit_price']))
    total = qty * up

    conn.execute(
        """UPDATE service_items SET
               item_category=?, provider_company_id=?, item_name=?,
               line_type=?, bundle_type=?, quantity=?, unit_price=?, total_price=?,
               notes=?, updated_at = datetime('now')
           WHERE id = ?""",
        (
            ic,
            data.get('provider_company_id', existing['provider_company_id']) or None,
            data.get('item_name', existing['item_name']),
            data.get('line_type', existing['line_type']),
            data.get('bundle_type', existing['bundle_type']),
            qty, up, total,
            data.get('notes', existing['notes']),
            item_id
        )
    )
    log_action(conn, None, f"Updated service item {item_id}",
               entity_type='service_item', entity_id=item_id)
    conn.commit()
    item = row_to_dict(conn.execute(
        "SELECT * FROM service_items WHERE id = ?", (item_id,)
    ).fetchone())
    conn.close()
    return jsonify({'message': 'Service item updated', 'service_item': item}), 200


@app.route('/api/service-items/<int:item_id>', methods=['DELETE'])
def delete_service_item(item_id):
    """DELETE /api/service-items/:id"""
    conn = get_db()
    conn.execute("DELETE FROM service_items WHERE id = ?", (item_id,))
    if conn.total_changes == 0:
        conn.close()
        return jsonify({'error': 'Service item not found'}), 404
    log_action(conn, None, f"Deleted service item {item_id}",
               entity_type='service_item', entity_id=item_id)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Service item deleted'}), 200


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENTS — Record payment and update service totals
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/organization-services/<int:service_id>/payments', methods=['POST'])
def record_payment(service_id):
    """
    POST /api/organization-services/:service_id/payments
    Body: { "amount", "payment_date", "note", "created_by" }
    Updates: paid_amount, due_amount, last_payment_amount, last_payment_date
    """
    data = request.get_json()
    if not data or data.get('amount') is None:
        return jsonify({'error': 'amount is required'}), 400

    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'error': 'amount must be positive'}), 400

    payment_date = data.get('payment_date') or ''
    if not payment_date:
        return jsonify({'error': 'payment_date is required'}), 400

    conn = get_db()
    service = row_to_dict(conn.execute(
        "SELECT * FROM organization_services WHERE id = ?", (service_id,)
    ).fetchone())
    if not service:
        conn.close()
        return jsonify({'error': 'Service not found'}), 404

    current_due = float(service['due_amount'] or 0)

    if amount > current_due:
        conn.close()
        return jsonify({'error': 'Payment amount cannot be greater than due amount'}), 400

    new_paid = float(service['paid_amount'] or 0) + amount
    new_due = current_due - amount
    created_by = data.get('created_by')

    conn.execute(
        """INSERT INTO payments (service_id, amount, payment_date, note, created_by)
           VALUES (?, ?, ?, ?, ?)""",
        (service_id, amount, payment_date, data.get('note'), created_by)
    )
    conn.execute(
        """UPDATE organization_services SET
               paid_amount = ?, due_amount = ?,
               last_payment_amount = ?, last_payment_date = ?,
               updated_at = datetime('now')
           WHERE id = ?""",
        (new_paid, new_due, amount, payment_date, service_id)
    )
    log_action(conn, created_by, f"Recorded payment for service {service_id}",
               entity_type='payment', entity_id=service_id,
               details=f"amount={amount}, payment_date={payment_date}")
    conn.commit()

    updated = row_to_dict(conn.execute(
        "SELECT * FROM organization_services WHERE id = ?", (service_id,)
    ).fetchone())
    conn.close()
    return jsonify({
        'message': 'Payment recorded',
        'service': updated,
        'payment': {'amount': amount, 'payment_date': payment_date}
    }), 201


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """GET /api/dashboard — Summary stats from new schema."""
    conn = get_db()

    stats = {
        'total_organizations': conn.execute(
            "SELECT COUNT(*) FROM organizations"
        ).fetchone()[0],
        'active_organizations': conn.execute(
            "SELECT COUNT(*) FROM organizations WHERE status = 'active'"
        ).fetchone()[0],
        'total_services': conn.execute(
            "SELECT COUNT(*) FROM organization_services"
        ).fetchone()[0],
        'active_services': conn.execute(
            "SELECT COUNT(*) FROM organization_services WHERE is_active = 1"
        ).fetchone()[0],
        'total_provider_companies': conn.execute(
            "SELECT COUNT(*) FROM provider_companies"
        ).fetchone()[0],
        'active_provider_companies': conn.execute(
            "SELECT COUNT(*) FROM provider_companies WHERE is_active = 1"
        ).fetchone()[0],
        'total_users': conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        'total_payments_count': conn.execute("SELECT COUNT(*) FROM payments").fetchone()[0],
        'total_paid_amount': conn.execute(
            "SELECT COALESCE(SUM(paid_amount), 0) FROM organization_services"
        ).fetchone()[0],
        'total_due_amount': conn.execute(
            "SELECT COALESCE(SUM(due_amount), 0) FROM organization_services"
        ).fetchone()[0],
        'organizations_by_status': rows_to_list(conn.execute(
            "SELECT status, COUNT(*) as count FROM organizations GROUP BY status"
        ).fetchall()),
        'recent_organizations': rows_to_list(conn.execute(
            """SELECT id, name, status, created_at FROM organizations
               ORDER BY created_at DESC LIMIT 5"""
        ).fetchall()),
    }
    conn.close()
    return jsonify(stats), 200


# ══════════════════════════════════════════════════════════════════════════════
# HISTORY (Activity Log)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/activity', methods=['GET'])
@app.route('/api/history', methods=['GET'])
def get_activity():
    """GET /api/activity or /api/history?limit=50"""
    limit = min(request.args.get('limit', 50, type=int), 200)
    conn = get_db()
    logs = rows_to_list(conn.execute(
        """SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
                  u.username
           FROM activity_log a
           LEFT JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC
           LIMIT ?""",
        (limit,)
    ).fetchall())
    conn.close()
    return jsonify({'activity': logs, 'count': len(logs)}), 200


@app.route('/api/history/all', methods=['GET'])
def get_full_history():
    try:
        limit = request.args.get('limit', 100, type=int)

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                al.id,
                'activity' AS kind,
                al.action,
                al.entity_type,
                al.entity_id,
                al.details,
                al.created_at,
                al.user_id,
                u.username
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ?
        """, (limit,))
        activity_rows = [dict(row) for row in cursor.fetchall()]

        cursor.execute("""
            SELECT
                p.id,
                'payment' AS kind,
                'Payment Recorded' AS action,
                'payment' AS entity_type,
                p.id AS entity_id,
                p.amount,
                p.payment_date,
                p.note,
                p.created_at,
                p.created_by AS user_id,
                u.username,
                s.id AS service_id,
                s.service_type,
                o.id AS organization_id,
                o.name AS organization_name
            FROM payments p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN organization_services s ON p.service_id = s.id
            LEFT JOIN organizations o ON s.organization_id = o.id
            ORDER BY p.created_at DESC
            LIMIT ?
        """, (limit,))
        payment_rows = [dict(row) for row in cursor.fetchall()]

        merged = []

        for row in activity_rows:
            merged.append({
                "id": f"activity-{row['id']}",
                "kind": "activity",
                "action": row.get("action"),
                "entity_type": row.get("entity_type"),
                "entity_id": row.get("entity_id"),
                "details": row.get("details"),
                "created_at": row.get("created_at"),
                "user_id": row.get("user_id"),
                "username": row.get("username"),
            })

        for row in payment_rows:
            merged.append({
                "id": f"payment-{row['id']}",
                "kind": "payment",
                "action": row.get("action"),
                "entity_type": "payment",
                "entity_id": row.get("entity_id"),
                "details": f"Organization: {row.get('organization_name') or '-'}\n"
                           f"Service Type: {row.get('service_type') or '-'}\n"
                           f"Service ID: {row.get('service_id') or '-'}\n"
                           f"Amount: {row.get('amount') or 0}\n"
                           f"Payment Date: {row.get('payment_date') or '-'}\n"
                           f"Note: {row.get('note') or '-'}",
                "created_at": row.get("created_at") or row.get("payment_date"),
                "user_id": row.get("user_id"),
                "username": row.get("username"),
                "payment_amount": row.get("amount"),
                "payment_date": row.get("payment_date"),
                "organization_id": row.get("organization_id"),
                "organization_name": row.get("organization_name"),
                "service_id": row.get("service_id"),
                "service_type": row.get("service_type"),
            })

        merged.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        conn.close()

        return jsonify({
            "count": len(merged),
            "history": merged[:limit * 2]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# SPECIAL SERVICE RANGES
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/service-ranges', methods=['GET'])
def get_service_ranges():
    try:
        service_name = request.args.get('service_name', '').strip()

        conn = get_db()
        cursor = conn.cursor()

        allowed_services = ['fna', 'gcc', 'انترانيت', 'دولي']

        if service_name:
            if service_name not in allowed_services:
                conn.close()
                return jsonify({"error": "Invalid service name"}), 400

            cursor.execute("""
                SELECT id, service_name, range_from, range_to, price, created_at
                FROM service_ranges
                WHERE service_name = ?
                ORDER BY range_from ASC, range_to ASC
            """, (service_name,))
        else:
            cursor.execute("""
                SELECT id, service_name, range_from, range_to, price, created_at
                FROM service_ranges
                ORDER BY service_name ASC, range_from ASC, range_to ASC
            """)

        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return jsonify({
            "count": len(rows),
            "ranges": rows
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/service-ranges', methods=['POST'])
def create_service_range():
    try:
        data = request.get_json() or {}

        service_name = str(data.get('service_name', '')).strip()
        range_from = data.get('range_from')
        range_to = data.get('range_to')
        price = data.get('price')

        allowed_services = ['fna', 'gcc', 'انترانيت', 'دولي']

        if service_name not in allowed_services:
            return jsonify({"error": "Invalid service name"}), 400

        if range_from is None or range_to is None or price is None:
            return jsonify({"error": "service_name, range_from, range_to, and price are required"}), 400

        range_from = int(range_from)
        range_to = int(range_to)
        price = float(price)

        if range_from > range_to:
            return jsonify({"error": "range_from must be less than or equal to range_to"}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO service_ranges (service_name, range_from, range_to, price)
            VALUES (?, ?, ?, ?)
        """, (service_name, range_from, range_to, price))

        new_id = cursor.lastrowid

        log_action(conn, None, f"Created range {service_name}",
                   entity_type='service_range', entity_id=new_id,
                   details=f"range_from={range_from}, range_to={range_to}, price={price}")

        conn.commit()

        cursor.execute("""
            SELECT id, service_name, range_from, range_to, price, created_at
            FROM service_ranges
            WHERE id = ?
        """, (new_id,))
        row = dict(cursor.fetchone())

        conn.close()

        return jsonify({
            "message": "Range created",
            "range": row
        }), 201

    except ValueError:
        return jsonify({"error": "Invalid numeric value"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/service-ranges/<int:range_id>', methods=['DELETE'])
def delete_service_range(range_id):
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM service_ranges WHERE id = ?", (range_id,))
        existing = cursor.fetchone()

        if not existing:
            conn.close()
            return jsonify({"error": "Range not found"}), 404

        cursor.execute("DELETE FROM service_ranges WHERE id = ?", (range_id,))
        log_action(conn, None, f"Deleted range {range_id}",
                   entity_type='service_range', entity_id=range_id)
        conn.commit()
        conn.close()

        return jsonify({"message": "Range deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# USERS (Admin)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/users', methods=['GET'])
def get_users():
    """GET /api/users"""
    conn = get_db()
    users = rows_to_list(conn.execute(
        "SELECT id, username, role, created_at, last_login FROM users ORDER BY id"
    ).fetchall())
    conn.close()
    return jsonify({'users': users, 'count': len(users)}), 200


@app.route('/api/users', methods=['POST'])
def create_user():
    """POST /api/users — Body: { "username", "password", "role" }"""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'username and password are required'}), 400

    role = data.get('role', 'user')
    if role not in ('user', 'admin'):
        return jsonify({'error': "role must be 'user' or 'admin'"}), 400

    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (data['username'], data['password'], role)
        )
        user_id = cursor.lastrowid
        log_action(conn, None, f"Created user {data['username']}",
                   entity_type='user', entity_id=user_id)
        conn.commit()
        user = row_to_dict(conn.execute(
            "SELECT id, username, role, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone())
        conn.close()
        return jsonify({'message': 'User created', 'user': user}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username already exists'}), 409


# ══════════════════════════════════════════════════════════════════════════════
# ERROR HANDLERS
# ══════════════════════════════════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Route not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    print("\n🚀 ITPC Management System Backend")
    print("   Running at: http://localhost:5000")
    print("   API base:   http://localhost:5000/api\n")
    app.run(debug=True, host='0.0.0.0', port=5000)