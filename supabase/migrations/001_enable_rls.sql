-- ============================================================================
-- KidneyCare Assistant - Row Level Security (RLS) Implementation
-- ============================================================================
-- 
-- IMPORTANT NOTES:
-- 1. Your app uses supabaseAdmin (service role key) which BYPASSES RLS
-- 2. RLS provides defense-in-depth security and enables future client-side access
-- 3. Run this on UNOFFICIAL DB first for testing, then on OFFICIAL DB
--
-- To run: Execute in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TestResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LabReportTestLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationPrescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssignedRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArchivedLabReport" ENABLE ROW LEVEL SECURITY;

-- Reference/Lookup tables (read-only for authenticated users)
ALTER TABLE public."TestType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Option" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Situation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecommendationTemplate" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: CREATE HELPER FUNCTION FOR CURRENT USER
-- ============================================================================
-- This function helps retrieve the current user's ID and role from JWT claims
-- Your app doesn't use Supabase Auth, but this is for future compatibility

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    NULL
  )
$$;

-- ============================================================================
-- PART 3: USER TABLE POLICIES
-- ============================================================================
-- Admins: Full access
-- Doctors: Can view their own profile only

-- Allow service role full access (your supabaseAdmin client)
CREATE POLICY "Service role has full access to User"
  ON public."User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own record
CREATE POLICY "Users can view their own profile"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING (id = public.get_current_user_id());

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- Admins can insert/update/delete users
CREATE POLICY "Admins can manage users"
  ON public."User"
  FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- ============================================================================
-- PART 4: PATIENT TABLE POLICIES
-- ============================================================================
-- Doctors: Can only access patients they created
-- Admins: Can view all patients (for statistics)

CREATE POLICY "Service role has full access to Patient"
  ON public."Patient"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can view/manage their own patients
CREATE POLICY "Doctors can manage their own patients"
  ON public."Patient"
  FOR ALL
  TO authenticated
  USING (doctorid = public.get_current_user_id())
  WITH CHECK (doctorid = public.get_current_user_id());

-- Admins can view all patients (read-only for stats)
CREATE POLICY "Admins can view all patients"
  ON public."Patient"
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- ============================================================================
-- PART 5: LAB REPORT TABLE POLICIES
-- ============================================================================
-- Doctors: Can only access lab reports for their patients

CREATE POLICY "Service role has full access to LabReport"
  ON public."LabReport"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can manage lab reports for their patients
CREATE POLICY "Doctors can manage lab reports for their patients"
  ON public."LabReport"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- Admins can view all lab reports
CREATE POLICY "Admins can view all lab reports"
  ON public."LabReport"
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- ============================================================================
-- PART 6: TEST RESULT TABLE POLICIES
-- ============================================================================

CREATE POLICY "Service role has full access to TestResult"
  ON public."TestResult"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can manage test results for their patients
CREATE POLICY "Doctors can manage test results for their patients"
  ON public."TestResult"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- Admins can view all test results
CREATE POLICY "Admins can view all test results"
  ON public."TestResult"
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- ============================================================================
-- PART 7: LAB REPORT TEST LINK TABLE POLICIES
-- ============================================================================

CREATE POLICY "Service role has full access to LabReportTestLink"
  ON public."LabReportTestLink"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can manage links for their patients' lab reports
CREATE POLICY "Doctors can manage lab report test links"
  ON public."LabReportTestLink"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = labreportid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = labreportid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- ============================================================================
-- PART 8: MEDICATION PRESCRIPTION TABLE POLICIES
-- ============================================================================

CREATE POLICY "Service role has full access to MedicationPrescription"
  ON public."MedicationPrescription"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can manage prescriptions for their patients
CREATE POLICY "Doctors can manage prescriptions for their patients"
  ON public."MedicationPrescription"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = reportid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = reportid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- Admins can view all prescriptions
CREATE POLICY "Admins can view all prescriptions"
  ON public."MedicationPrescription"
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- ============================================================================
-- PART 9: ASSIGNED RECOMMENDATION TABLE POLICIES
-- ============================================================================

CREATE POLICY "Service role has full access to AssignedRecommendation"
  ON public."AssignedRecommendation"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can manage recommendations for their patients
CREATE POLICY "Doctors can manage recommendations for their patients"
  ON public."AssignedRecommendation"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = labreportid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."LabReport" lr
      JOIN public."Patient" p ON p.id = lr.patientid
      WHERE lr.id = labreportid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- ============================================================================
-- PART 10: ARCHIVED LAB REPORT TABLE POLICIES
-- ============================================================================

CREATE POLICY "Service role has full access to ArchivedLabReport"
  ON public."ArchivedLabReport"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Doctors can view/create archived reports for their patients
CREATE POLICY "Doctors can manage archived reports for their patients"
  ON public."ArchivedLabReport"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Patient" p 
      WHERE p.id = patientid 
      AND p.doctorid = public.get_current_user_id()
    )
  );

-- ============================================================================
-- PART 11: REFERENCE/LOOKUP TABLE POLICIES (READ-ONLY)
-- ============================================================================
-- These tables are read-only for all authenticated users

-- TestType
CREATE POLICY "Service role has full access to TestType"
  ON public."TestType"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read TestType"
  ON public."TestType"
  FOR SELECT
  TO authenticated
  USING (true);

-- MedicationType
CREATE POLICY "Service role has full access to MedicationType"
  ON public."MedicationType"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read MedicationType"
  ON public."MedicationType"
  FOR SELECT
  TO authenticated
  USING (true);

-- Question
CREATE POLICY "Service role has full access to Question"
  ON public."Question"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read Question"
  ON public."Question"
  FOR SELECT
  TO authenticated
  USING (true);

-- Option
CREATE POLICY "Service role has full access to Option"
  ON public."Option"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read Option"
  ON public."Option"
  FOR SELECT
  TO authenticated
  USING (true);

-- Situation
CREATE POLICY "Service role has full access to Situation"
  ON public."Situation"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read Situation"
  ON public."Situation"
  FOR SELECT
  TO authenticated
  USING (true);

-- Bucket
CREATE POLICY "Service role has full access to Bucket"
  ON public."Bucket"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read Bucket"
  ON public."Bucket"
  FOR SELECT
  TO authenticated
  USING (true);

-- Group
CREATE POLICY "Service role has full access to Group"
  ON public."Group"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read Group"
  ON public."Group"
  FOR SELECT
  TO authenticated
  USING (true);

-- RecommendationTemplate
CREATE POLICY "Service role has full access to RecommendationTemplate"
  ON public."RecommendationTemplate"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read RecommendationTemplate"
  ON public."RecommendationTemplate"
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 12: GRANT PERMISSIONS
-- ============================================================================
-- Ensure the anon and authenticated roles have basic permissions

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant SELECT on reference tables to all roles
GRANT SELECT ON public."TestType" TO anon, authenticated;
GRANT SELECT ON public."MedicationType" TO anon, authenticated;
GRANT SELECT ON public."Question" TO anon, authenticated;
GRANT SELECT ON public."Option" TO anon, authenticated;
GRANT SELECT ON public."Situation" TO anon, authenticated;
GRANT SELECT ON public."Bucket" TO anon, authenticated;
GRANT SELECT ON public."Group" TO anon, authenticated;
GRANT SELECT ON public."RecommendationTemplate" TO anon, authenticated;

-- Grant all permissions to service_role (your supabaseAdmin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying the migration to verify RLS is enabled

-- Check RLS status on all tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';
