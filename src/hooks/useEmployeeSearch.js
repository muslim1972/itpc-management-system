import { useState, useEffect, useRef } from 'react';
import { supabase, publicSupabase } from '../lib/supabase';

export function useEmployeeSearch(options = {}) {
    const {
        selectFields = 'id, full_name, job_number, username, admin_role',
        limit = 50,
        debounceMs = 300,
        enabled = true,
        usePublicView = true
    } = options;

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const abortRef = useRef(null);

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed || !enabled) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const timer = setTimeout(async () => {
            // Cancel previous request
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                // Building the OR clause for name or job number
                // Available profiles in public schema
                let orClause = `job_number.ilike.${trimmed}%,full_name.ilike.${trimmed}%`;

                const tableName = usePublicView ? 'available_profiles' : 'profiles';
                
                // Note: since we are in itpc schema client by default in Int-Karbala, 
                // we might need to specify the public schema for available_profiles
                // but usually the supabase client is configured with a default schema.
                // In Int-Karbala, it seems it's configured for 'itpc'.
                // So we use .from('public.available_profiles')
                
                let queryBuilder = publicSupabase
                    .from(usePublicView ? 'available_profiles' : 'profiles')
                    .select(selectFields)
                    .or(orClause)
                    .order('full_name')
                    .limit(limit);

                const { data, error } = await queryBuilder;

                if (controller.signal.aborted) return;
                if (error) throw error;

                setResults(data || []);
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    console.error('Employee search error:', err);
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsSearching(false);
                }
            }
        }, debounceMs);

        return () => {
            clearTimeout(timer);
        };
    }, [query, enabled, selectFields, limit, debounceMs, usePublicView]);

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsSearching(false);
    };

    return {
        query,
        setQuery,
        results,
        isSearching,
        clearSearch
    };
}
