-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ArchivedLabReport (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  labreportid uuid NOT NULL,
  patientid uuid NOT NULL,
  reportdata jsonb NOT NULL,
  testresults jsonb,
  recommendations jsonb,
  deletedby uuid NOT NULL,
  deletedat timestamp with time zone DEFAULT now(),
  deletionreason text,
  medications jsonb,
  CONSTRAINT ArchivedLabReport_pkey PRIMARY KEY (id),
  CONSTRAINT ArchivedLabReport_patientid_fkey FOREIGN KEY (patientid) REFERENCES public.Patient(id),
  CONSTRAINT ArchivedLabReport_deletedby_fkey FOREIGN KEY (deletedby) REFERENCES public.User(id)
);
CREATE TABLE public.AssignedRecommendation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  labreportid uuid NOT NULL,
  questionid integer NOT NULL,
  selectedoptionid integer NOT NULL,
  assignedbyid uuid NOT NULL,
  createdat timestamp with time zone DEFAULT now(),
  CONSTRAINT AssignedRecommendation_pkey PRIMARY KEY (id),
  CONSTRAINT AssignedRecommendation_assignedbyid_fkey FOREIGN KEY (assignedbyid) REFERENCES public.User(id),
  CONSTRAINT AssignedRecommendation_labreportid_fkey FOREIGN KEY (labreportid) REFERENCES public.LabReport(id),
  CONSTRAINT AssignedRecommendation_questionid_fkey FOREIGN KEY (questionid) REFERENCES public.Question(id),
  CONSTRAINT AssignedRecommendation_selectedoptionid_fkey FOREIGN KEY (selectedoptionid) REFERENCES public.Option(id)
);
CREATE TABLE public.Bucket (
  id integer NOT NULL DEFAULT nextval('"Bucket_id_seq"'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  CONSTRAINT Bucket_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Group (
  id integer NOT NULL,
  name text NOT NULL,
  CONSTRAINT Group_pkey PRIMARY KEY (id)
);
CREATE TABLE public.LabReport (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patientid uuid NOT NULL,
  doctorid uuid,
  reportdate timestamp with time zone NOT NULL,
  notes text,
  createdat timestamp with time zone DEFAULT now(),
  situationid integer,
  lastmodified timestamp with time zone,
  lastmodifiedby uuid,
  CONSTRAINT LabReport_pkey PRIMARY KEY (id),
  CONSTRAINT LabReport_doctorid_fkey FOREIGN KEY (doctorid) REFERENCES public.User(id),
  CONSTRAINT LabReport_patientid_fkey FOREIGN KEY (patientid) REFERENCES public.Patient(id),
  CONSTRAINT fk_labreport_situation FOREIGN KEY (situationid) REFERENCES public.Situation(id),
  CONSTRAINT LabReport_lastmodifiedby_fkey FOREIGN KEY (lastmodifiedby) REFERENCES public.User(id)
);
CREATE TABLE public.LabReportTestLink (
  labreportid uuid NOT NULL,
  testresultid uuid NOT NULL,
  reused boolean DEFAULT false,
  CONSTRAINT LabReportTestLink_pkey PRIMARY KEY (labreportid, testresultid),
  CONSTRAINT LabReportTestLink_labreportid_fkey FOREIGN KEY (labreportid) REFERENCES public.LabReport(id),
  CONSTRAINT LabReportTestLink_testresultid_fkey FOREIGN KEY (testresultid) REFERENCES public.TestResult(id)
);
CREATE TABLE public.MedicationPrescription (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reportid uuid NOT NULL,
  medicationtypeid integer NOT NULL,
  dosage numeric NOT NULL,
  createdat timestamp with time zone DEFAULT now(),
  isoutdated boolean DEFAULT false,
  outdatedat timestamp with time zone,
  outdatedreason text,
  outdatedby uuid,
  CONSTRAINT MedicationPrescription_pkey PRIMARY KEY (id),
  CONSTRAINT medicationprescription_reportid_fkey FOREIGN KEY (reportid) REFERENCES public.LabReport(id),
  CONSTRAINT medicationprescription_medicationtypeid_fkey FOREIGN KEY (medicationtypeid) REFERENCES public.MedicationType(id),
  CONSTRAINT MedicationPrescription_outdatedby_fkey FOREIGN KEY (outdatedby) REFERENCES public.User(id)
);
CREATE TABLE public.MedicationType (
  id integer NOT NULL DEFAULT nextval('medicationtype_id_seq'::regclass),
  name text NOT NULL,
  unit text NOT NULL,
  groupname text NOT NULL,
  CONSTRAINT MedicationType_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Option (
  id integer NOT NULL,
  text text NOT NULL,
  questionid integer NOT NULL,
  CONSTRAINT Option_pkey PRIMARY KEY (id),
  CONSTRAINT Option_questionid_fkey FOREIGN KEY (questionid) REFERENCES public.Question(id)
);
CREATE TABLE public.Patient (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age integer NOT NULL,
  gender USER-DEFINED NOT NULL,
  nationalid text NOT NULL UNIQUE,
  contactinfo text,
  createdat timestamp with time zone DEFAULT now(),
  doctorid uuid NOT NULL,
  CONSTRAINT Patient_pkey PRIMARY KEY (id),
  CONSTRAINT Patient_doctorid_fkey FOREIGN KEY (doctorid) REFERENCES public.User(id)
);
CREATE TABLE public.Question (
  id integer NOT NULL,
  text text NOT NULL,
  CONSTRAINT Question_pkey PRIMARY KEY (id)
);
CREATE TABLE public.RecommendationTemplate (
  situationid integer NOT NULL,
  questionid integer NOT NULL,
  defaultoptionid integer NOT NULL,
  CONSTRAINT RecommendationTemplate_pkey PRIMARY KEY (situationid, questionid),
  CONSTRAINT RecommendationTemplate_defaultoptionid_fkey FOREIGN KEY (defaultoptionid) REFERENCES public.Option(id),
  CONSTRAINT RecommendationTemplate_questionid_fkey FOREIGN KEY (questionid) REFERENCES public.Question(id)
);
CREATE TABLE public.Situation (
  id integer NOT NULL DEFAULT nextval('"Situation_id_seq"'::regclass),
  code text NOT NULL,
  description text,
  groupid integer NOT NULL,
  bucketid integer NOT NULL,
  CONSTRAINT Situation_pkey PRIMARY KEY (id),
  CONSTRAINT Situation_bucketid_fkey FOREIGN KEY (bucketid) REFERENCES public.Bucket(id),
  CONSTRAINT Situation_groupid_fkey FOREIGN KEY (groupid) REFERENCES public.Group(id)
);
CREATE TABLE public.TestResult (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patientid uuid NOT NULL,
  testtypeid integer NOT NULL,
  value double precision,
  reportfile text,
  testdate timestamp with time zone NOT NULL,
  createdat timestamp with time zone DEFAULT now(),
  enteredbyid uuid,
  lastmodified timestamp with time zone,
  lastmodifiedby uuid,
  CONSTRAINT TestResult_pkey PRIMARY KEY (id),
  CONSTRAINT TestResult_enteredbyid_fkey FOREIGN KEY (enteredbyid) REFERENCES public.User(id),
  CONSTRAINT TestResult_patientid_fkey FOREIGN KEY (patientid) REFERENCES public.Patient(id),
  CONSTRAINT TestResult_testtypeid_fkey FOREIGN KEY (testtypeid) REFERENCES public.TestType(id),
  CONSTRAINT fk_patient FOREIGN KEY (patientid) REFERENCES public.Patient(id),
  CONSTRAINT fk_testtype FOREIGN KEY (testtypeid) REFERENCES public.TestType(id),
  CONSTRAINT TestResult_lastmodifiedby_fkey FOREIGN KEY (lastmodifiedby) REFERENCES public.User(id)
);
CREATE TABLE public.TestType (
  id integer NOT NULL DEFAULT nextval('"TestType_id_seq"'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text,
  category USER-DEFINED NOT NULL,
  validitymonths integer DEFAULT 1,
  CONSTRAINT TestType_pkey PRIMARY KEY (id)
);
CREATE TABLE public.User (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  passwordHash text NOT NULL,
  role USER-DEFINED NOT NULL,
  createdat timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true,
  deactivatedat timestamp with time zone,
  deactivatedby uuid,
  CONSTRAINT User_pkey PRIMARY KEY (id),
  CONSTRAINT User_deactivatedby_fkey FOREIGN KEY (deactivatedby) REFERENCES public.User(id)
);