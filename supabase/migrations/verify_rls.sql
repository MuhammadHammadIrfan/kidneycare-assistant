-- ============================================================================
-- VERIFY RLS IMPLEMENTATION
-- ============================================================================
-- Run this after applying the RLS migration to verify everything is working
-- ============================================================================

-- ============================================================================
-- 1. CHECK RLS IS ENABLED ON ALL TABLES
-- ============================================================================

SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 2. LIST ALL POLICIES
-- ============================================================================

SELECT 
    tablename,
    policyname,
    CASE permissive WHEN 'PERMISSIVE' THEN 'Allow' ELSE 'Deny' END as type,
    roles::text,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. COUNT POLICIES PER TABLE
-- ============================================================================

SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 4. VERIFY SERVICE ROLE HAS FULL ACCESS
-- ============================================================================
-- These should all return rows (service_role should have access)

-- Test with service role - these queries should work when run from your app
-- SELECT COUNT(*) FROM public."User";
-- SELECT COUNT(*) FROM public."Patient";
-- SELECT COUNT(*) FROM public."LabReport";

-- ============================================================================
-- 5. CHECK HELPER FUNCTIONS EXIST
-- ============================================================================

SELECT 
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM pg_proc 
WHERE proname IN ('get_current_user_id', 'get_current_user_role')
AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 
-- All tables should show RLS ENABLED
-- Each table should have at least 1 policy for service_role
-- Key tables (User, Patient, LabReport, etc.) should have multiple policies
-- Helper functions should exist
--
-- ============================================================================
