-- 1. إنشاء السكيما المستقلة
CREATE SCHEMA IF NOT EXISTS itpc;

-- 2. إعداد البحث التلقائي ليشمل السكيما الجديدة
-- ALTER ROLE authenticator SET search_path TO itpc, public;
-- ALTER ROLE postgres SET search_path TO itpc, public;

-- 3. إنشاء الجداول داخل سكيما itpc (تم تحويلها لتناسب PostgreSQL)

CREATE TABLE IF NOT EXISTS itpc.users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS itpc.organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    location TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itpc.provider_companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itpc.provider_subscriptions (
    id SERIAL PRIMARY KEY,
    provider_company_id INTEGER NOT NULL,
    service_type TEXT NOT NULL CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')),
    item_category TEXT NOT NULL CHECK(item_category IN ('Line', 'Bundle', 'Other')),
    item_name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    unit_label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_provider FOREIGN KEY (provider_company_id) REFERENCES itpc.provider_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itpc.organization_services (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    service_type TEXT NOT NULL CHECK(service_type IN ('Wireless', 'FTTH', 'Optical', 'Other')),
    payment_method TEXT NOT NULL DEFAULT 'شهري' CHECK(payment_method IN ('يومي', 'شهري', 'كل 3 أشهر', 'سنوي')),
    payment_interval_days INTEGER DEFAULT 1,
    device_ownership TEXT NOT NULL DEFAULT 'الشركة' CHECK(device_ownership IN ('الشركة', 'المنظمة', 'الوزارة')),
    annual_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    due_amount REAL NOT NULL DEFAULT 0,
    contract_created_at TEXT,
    contract_duration_unit TEXT NOT NULL DEFAULT 'شهري' CHECK(contract_duration_unit IN ('يومي', 'شهري', 'سنوي')),
    contract_duration_value INTEGER NOT NULL DEFAULT 1,
    due_date TEXT,
    last_payment_amount REAL DEFAULT 0,
    last_payment_date TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    service_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES itpc.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itpc.service_items (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    item_category TEXT NOT NULL CHECK(item_category IN ('Line', 'Bundle', 'Other')),
    provider_company_id INTEGER,
    item_name TEXT,
    line_type TEXT,
    bundle_type TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service FOREIGN KEY (service_id) REFERENCES itpc.organization_services(id) ON DELETE CASCADE,
    CONSTRAINT fk_provider_item FOREIGN KEY (provider_company_id) REFERENCES itpc.provider_companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS itpc.payments (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    note TEXT,
    created_by INTEGER,
    contract_period_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_pay FOREIGN KEY (service_id) REFERENCES itpc.organization_services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itpc.service_ranges (
    id SERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    range_from INTEGER NOT NULL,
    range_to INTEGER NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itpc.service_contract_periods (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL,
    period_number INTEGER NOT NULL DEFAULT 1,
    period_label TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    contract_duration_unit TEXT NOT NULL DEFAULT 'شهري' CHECK(contract_duration_unit IN ('يومي', 'شهري', 'سنوي')),
    contract_duration_value INTEGER NOT NULL DEFAULT 1,
    payment_method TEXT NOT NULL DEFAULT 'شهري' CHECK(payment_method IN ('يومي', 'شهري', 'كل 3 أشهر', 'سنوي')),
    base_amount REAL NOT NULL DEFAULT 0,
    carried_debt REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    due_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed', 'archived')),
    closed_reason TEXT,
    previous_period_id INTEGER,
    renewal_created_at TEXT,
    closed_at TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_period FOREIGN KEY (service_id) REFERENCES itpc.organization_services(id) ON DELETE CASCADE,
    UNIQUE(service_id, period_number)
);

CREATE TABLE IF NOT EXISTS itpc.app_news (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء الفهارس (Indexes)
CREATE INDEX IF NOT EXISTS idx_itpc_org_name ON itpc.organizations(name);
CREATE INDEX IF NOT EXISTS idx_itpc_service_org ON itpc.organization_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_itpc_item_service ON itpc.service_items(service_id);
