-- ============================================================================
-- ROLLBACK: Disable RLS if something goes wrong
-- ============================================================================
-- 
-- Run this ONLY if you need to undo the RLS changes
-- This will disable RLS and drop all policies
--
-- ============================================================================

-- ============================================================================
-- DROP ALL POLICIES
-- ============================================================================

-- User table policies
DROP POLICY IF EXISTS "Service role has full access to User" ON public."User";
DROP POLICY IF EXISTS "Users can view their own profile" ON public."User";
DROP POLICY IF EXISTS "Admins can view all users" ON public."User";
DROP POLICY IF EXISTS "Admins can manage users" ON public."User";

-- Patient table policies
DROP POLICY IF EXISTS "Service role has full access to Patient" ON public."Patient";
DROP POLICY IF EXISTS "Doctors can manage their own patients" ON public."Patient";
DROP POLICY IF EXISTS "Admins can view all patients" ON public."Patient";

-- LabReport table policies
DROP POLICY IF EXISTS "Service role has full access to LabReport" ON public."LabReport";
DROP POLICY IF EXISTS "Doctors can manage lab reports for their patients" ON public."LabReport";
DROP POLICY IF EXISTS "Admins can view all lab reports" ON public."LabReport";

-- TestResult table policies
DROP POLICY IF EXISTS "Service role has full access to TestResult" ON public."TestResult";
DROP POLICY IF EXISTS "Doctors can manage test results for their patients" ON public."TestResult";
DROP POLICY IF EXISTS "Admins can view all test results" ON public."TestResult";

-- LabReportTestLink table policies
DROP POLICY IF EXISTS "Service role has full access to LabReportTestLink" ON public."LabReportTestLink";
DROP POLICY IF EXISTS "Doctors can manage lab report test links" ON public."LabReportTestLink";

-- MedicationPrescription table policies
DROP POLICY IF EXISTS "Service role has full access to MedicationPrescription" ON public."MedicationPrescription";
DROP POLICY IF EXISTS "Doctors can manage prescriptions for their patients" ON public."MedicationPrescription";
DROP POLICY IF EXISTS "Admins can view all prescriptions" ON public."MedicationPrescription";

-- AssignedRecommendation table policies
DROP POLICY IF EXISTS "Service role has full access to AssignedRecommendation" ON public."AssignedRecommendation";
DROP POLICY IF EXISTS "Doctors can manage recommendations for their patients" ON public."AssignedRecommendation";

-- ArchivedLabReport table policies
DROP POLICY IF EXISTS "Service role has full access to ArchivedLabReport" ON public."ArchivedLabReport";
DROP POLICY IF EXISTS "Doctors can manage archived reports for their patients" ON public."ArchivedLabReport";

-- Reference table policies
DROP POLICY IF EXISTS "Service role has full access to TestType" ON public."TestType";
DROP POLICY IF EXISTS "Authenticated users can read TestType" ON public."TestType";

DROP POLICY IF EXISTS "Service role has full access to MedicationType" ON public."MedicationType";
DROP POLICY IF EXISTS "Authenticated users can read MedicationType" ON public."MedicationType";

DROP POLICY IF EXISTS "Service role has full access to Question" ON public."Question";
DROP POLICY IF EXISTS "Authenticated users can read Question" ON public."Question";

DROP POLICY IF EXISTS "Service role has full access to Option" ON public."Option";
DROP POLICY IF EXISTS "Authenticated users can read Option" ON public."Option";

DROP POLICY IF EXISTS "Service role has full access to Situation" ON public."Situation";
DROP POLICY IF EXISTS "Authenticated users can read Situation" ON public."Situation";

DROP POLICY IF EXISTS "Service role has full access to Bucket" ON public."Bucket";
DROP POLICY IF EXISTS "Authenticated users can read Bucket" ON public."Bucket";

DROP POLICY IF EXISTS "Service role has full access to Group" ON public."Group";
DROP POLICY IF EXISTS "Authenticated users can read Group" ON public."Group";

DROP POLICY IF EXISTS "Service role has full access to RecommendationTemplate" ON public."RecommendationTemplate";
DROP POLICY IF EXISTS "Authenticated users can read RecommendationTemplate" ON public."RecommendationTemplate";

-- ============================================================================
-- DISABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Patient" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabReport" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."TestResult" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabReportTestLink" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationPrescription" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssignedRecommendation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArchivedLabReport" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."TestType" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationType" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Question" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Option" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Situation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bucket" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Group" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecommendationTemplate" DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS has been DISABLED on all tables';
    RAISE NOTICE 'All policies have been removed';
    RAISE NOTICE '========================================';
END $$;
