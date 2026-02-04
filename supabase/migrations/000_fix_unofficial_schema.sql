-- ============================================================================
-- FIX UNOFFICIAL DB SCHEMA DIFFERENCES
-- ============================================================================
-- 
-- This script fixes the differences found between unofficial and official DBs
-- Run this on the UNOFFICIAL DB only
--
-- ============================================================================

-- ============================================================================
-- ISSUE 1: TestResult has duplicate foreign key constraints
-- ============================================================================
-- Unofficial DB has these duplicate constraints that don't exist in official:
-- - fk_patient (duplicate of TestResult_patientid_fkey)
-- - fk_testtype (duplicate of TestResult_testtypeid_fkey)

-- First, check if the constraints exist before dropping
DO $$
BEGIN
    -- Drop duplicate fk_patient constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_patient' 
        AND table_name = 'TestResult'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public."TestResult" DROP CONSTRAINT fk_patient;
        RAISE NOTICE 'Dropped duplicate constraint fk_patient from TestResult';
    ELSE
        RAISE NOTICE 'Constraint fk_patient does not exist (already fixed or never existed)';
    END IF;

    -- Drop duplicate fk_testtype constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_testtype' 
        AND table_name = 'TestResult'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public."TestResult" DROP CONSTRAINT fk_testtype;
        RAISE NOTICE 'Dropped duplicate constraint fk_testtype from TestResult';
    ELSE
        RAISE NOTICE 'Constraint fk_testtype does not exist (already fixed or never existed)';
    END IF;
END $$;

-- ============================================================================
-- ISSUE 2: MedicationType sequence name mismatch
-- ============================================================================
-- Unofficial: nextval('medicationtype_id_seq')
-- Official:   nextval('"MedicationType_id_seq"')
--
-- This is a minor cosmetic difference in the sequence name
-- PostgreSQL handles this internally, but for consistency:

-- Check if the lowercase sequence exists and rename it to match official
DO $$
BEGIN
    -- Check if medicationtype_id_seq exists (lowercase)
    IF EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename = 'medicationtype_id_seq'
    ) THEN
        -- Rename to match official naming convention
        ALTER SEQUENCE public.medicationtype_id_seq RENAME TO "MedicationType_id_seq";
        RAISE NOTICE 'Renamed sequence medicationtype_id_seq to MedicationType_id_seq';
    ELSE
        RAISE NOTICE 'Sequence medicationtype_id_seq does not exist (already using correct name)';
    END IF;
END $$;

-- ============================================================================
-- ISSUE 3: RecommendationTemplate PRIMARY KEY column order
-- ============================================================================
-- Unofficial: PRIMARY KEY (situationid, questionid)
-- Official:   PRIMARY KEY (questionid, situationid)
--
-- This doesn't affect functionality, just index ordering
-- Keeping this as informational - no action required unless you want exact parity
--
-- If you want to fix this (OPTIONAL - not recommended for production):
-- 1. This would require recreating the primary key
-- 2. Could cause downtime
-- 3. Functionally identical
--
-- Uncomment below if you really want to fix this:
/*
DO $$
BEGIN
    -- Check current primary key order
    RAISE NOTICE 'RecommendationTemplate primary key order difference is cosmetic only';
    RAISE NOTICE 'Unofficial: (situationid, questionid)';
    RAISE NOTICE 'Official: (questionid, situationid)';
    RAISE NOTICE 'Both work identically - no action taken';
    
    -- If you really want to change it:
    -- ALTER TABLE public."RecommendationTemplate" DROP CONSTRAINT "RecommendationTemplate_pkey";
    -- ALTER TABLE public."RecommendationTemplate" ADD PRIMARY KEY (questionid, situationid);
END $$;
*/

-- ============================================================================
-- VERIFICATION: Compare constraints
-- ============================================================================
-- Run this to see all constraints on TestResult table:

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'TestResult'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Show RecommendationTemplate primary key info:
SELECT 
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'RecommendationTemplate'
    AND tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.constraint_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema fix script completed!';
    RAISE NOTICE 'Please verify the output above.';
    RAISE NOTICE '========================================';
END $$;
