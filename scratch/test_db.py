import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = 'postgresql://admin_user:ew4jkrqe1Jb5diGCtwewndZFS4BqJrR4@dpg-d6uella4d50c73crdj50-a.frankfurt-postgres.render.com/itpc_management'

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute("SET search_path TO itpc, public;")
    
    print("Testing creating service contract periods...")
    
    placeholder = "%s"
    
    print("Testing organization_services insert...")
    cursor.execute(f"""
                INSERT INTO organization_services (
                    organization_id, service_type, payment_method, device_ownership, 
                    annual_amount, paid_amount, due_amount, payment_interval_days,
                    contract_created_at, contract_duration_unit, contract_duration_value, due_date
                ) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                RETURNING *
            """, (
                4, 'Other', 'شهري', 
                'الشركة', 360000.0, 360000.0,
                1, '2026-04-03',
                'شهري', 6, '2026-10-03'
            ))
            
    service = cursor.fetchone()
    print("Inserted service:", service)

    start_date = '2026-04-03'
    end_date = '2026-10-03'

    cursor.execute(f"""
                INSERT INTO service_contract_periods (
                    service_id, period_number, period_label, start_date, end_date,
                    contract_duration_unit, contract_duration_value, payment_method,
                    base_amount, carried_debt, total_amount, paid_amount, due_amount,
                    status, created_at, updated_at
                ) VALUES ({placeholder}, 1, 'الفترة 1', {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, 0, {placeholder}, 0, {placeholder}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                service[0], start_date, end_date,
                'شهري', 6, 'شهري',
                360000.0, 360000.0, 360000.0
            ))
    print("Inserted period.")
    
    conn.rollback()
    
except Exception as e:
    print("ERROR OCCURRED:")
    import traceback
    traceback.print_exc()

