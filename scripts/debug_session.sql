-- =====================================================================================
-- سكربت فحص وتشخيص استلام التوكنات (Debugging Script)
-- =====================================================================================

CREATE OR REPLACE FUNCTION itpc.debug_session()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = itpc, pg_temp
AS $$
DECLARE
    h_token text;
    auth_header text;
    v_user_id integer;
    v_role text;
    is_expired boolean;
BEGIN
    -- قراءة الهيدرات
    BEGIN
        h_token := current_setting('request.headers', true)::json ->> 'x-session-token';
        auth_header := current_setting('request.headers', true)::json ->> 'authorization';
    EXCEPTION WHEN OTHERS THEN
        h_token := 'ERROR_READING_HEADERS';
    END;

    IF h_token IS NULL OR h_token = '' THEN
        h_token := 'NOT_FOUND';
    END IF;

    -- محاولة فحص قاعدة البيانات إذا كان التوكن موجوداً
    IF h_token != 'NOT_FOUND' AND h_token != 'ERROR_READING_HEADERS' THEN
        SELECT user_id INTO v_user_id
        FROM itpc.active_sessions
        WHERE token::text = h_token
        LIMIT 1;

        SELECT (expires_at <= now()) INTO is_expired
        FROM itpc.active_sessions
        WHERE token::text = h_token
        LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            SELECT role INTO v_role
            FROM itpc.users
            WHERE id = v_user_id
            LIMIT 1;
        END IF;
    END IF;

    RETURN json_build_object(
        'received_x_session_token', h_token,
        'received_authorization', auth_header,
        'found_user_id_in_db', v_user_id,
        'is_expired', is_expired,
        'found_role_in_db', v_role,
        'final_policy_result', itpc.get_role_from_session()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION itpc.debug_session() TO public;
