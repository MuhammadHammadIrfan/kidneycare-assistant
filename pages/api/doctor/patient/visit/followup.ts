import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import nookies from "nookies";
import { classifyPatientSituation } from "../../../../../lib/classify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  const { patientId, testValues, notes } = req.body;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }
  
  if (!patientId || !testValues) {
    return res.status(400).json({ error: "Patient ID and test values are required" });
  }

  // Verify patient belongs to this doctor
  const { data: patientData, error: patientError } = await supabaseAdmin
    .from("Patient")
    .select("id, doctorid")
    .eq("id", patientId)
    .single();

  if (patientError || !patientData) {
    return res.status(404).json({ error: "Patient not found" });
  }

  if (patientData.doctorid !== doctorId) {
    return res.status(403).json({ error: "Access denied: This patient belongs to another doctor" });
  }

  // Fetch previous PTH (most recent before this report)
  const { data: prevPthData, error: prevPthError } = await supabaseAdmin
    .from("TestResult")
    .select("value, testdate")
    .eq("patientid", patientId)
    .eq("testtypeid", 1)  // PTH test type
    .order("testdate", { ascending: false })
    .limit(1);

  if (prevPthError) {
    console.error("Error fetching previous PTH:", prevPthError);
  }

  const prevPTH = prevPthData && prevPthData.length > 0 ? Number(prevPthData[0].value) : undefined;
  console.log("PrevPTH for follow-up:", prevPTH);

  // Prepare values for classification
  const classifyInput = {
    PTH: Number(testValues.PTH),
    prevPTH,
    Ca: Number(testValues.Ca),
    CaCorrected: Number(testValues.CaCorrected),
    Phos: Number(testValues.Phos),
    Echo: Number(testValues.Echo) === 1,
    LARad: Number(testValues.LARad),
  };

  // Classify group, bucket, situation
  const { group, bucket, situation } = classifyPatientSituation(classifyInput);
  console.log(`Follow-up classification - Group: ${group}, Bucket: ${bucket}, Situation: ${situation}`);

  // Fetch situationId from DB
  const { data: situationRow } = await supabaseAdmin
    .from("Situation")
    .select("id, groupid, code")
    .eq("groupid", group)
    .eq("code", situation)
    .single();

  const situationId = situationRow?.id || null;

  // 1. Create LabReport (follow-up visit)
  const { data: labReportData, error: labReportError } = await supabaseAdmin
    .from("LabReport")
    .insert([
      {
        patientid: patientId,
        doctorid: doctorId,
        reportdate: new Date().toISOString(),
        notes: notes || "",
        situationid: situationId,
      },
    ])
    .select();

  if (labReportError || !labReportData || labReportData.length === 0) {
    console.error("Lab report creation error:", labReportError);
    return res.status(500).json({ error: "Failed to create lab report" });
  }

  const labReportId = labReportData[0].id;

  // 2. Insert new test results
  // Create test results for each test value
  const testPromises = Object.entries(testValues).map(async ([testCode, value]) => {
    if (value === "" || value === null || value === undefined) return null;

    // Get test type ID
    const { data: testType, error: testTypeError } = await supabaseAdmin
      .from("TestType")
      .select("id")
      .eq("code", testCode)
      .single();

    if (testTypeError || !testType) {
      console.error(`Test type not found for code: ${testCode}`, testTypeError);
      return null;
    }

    // Insert test result with TODAY's date - Remove labreportid since it doesn't exist in your schema
    const { data: testResult, error: testResultError } = await supabaseAdmin
      .from("TestResult")
      .insert({
        patientid: patientId,
        testtypeid: testType.id,
        value: parseFloat(value.toString()),
        testdate: new Date().toISOString().split('T')[0], // ✅ TODAY'S DATE
        enteredbyid: doctorId, // Add the doctor who entered the test
        // Remove labreportid - not in your schema
      })
      .select("id")
      .single();

    if (testResultError) {
      console.error(`Failed to create test result for ${testCode}:`, testResultError);
      return null;
    }

    console.log(`[FOLLOWUP API] Created test result for ${testCode}: ${testResult.id} with date ${new Date().toISOString().split('T')[0]}`);
    return testResult.id;
  });

  const testResultIds = (await Promise.all(testPromises)).filter(Boolean);
  console.log(`[FOLLOWUP API] Created ${testResultIds.length} test results with today's date`);

  // 3. Link test results to lab report (keep this as is since LabReportTestLink table exists)
  if (testResultIds.length > 0) {
    const links = testResultIds.map(testResultId => ({
      labreportid: labReportId,
      testresultid: testResultId,
      reused: false,
    }));
    const { error: linkError } = await supabaseAdmin
      .from("LabReportTestLink")
      .insert(links);
    if (linkError) {
      console.error("Lab report link error:", linkError);
      return res.status(500).json({ error: "Failed to link test results to report" });
    }
    console.log(`[FOLLOWUP API] Linked ${testResultIds.length} test results to lab report ${labReportId}`);
  }

  // Return response with proper timing
  return res.status(200).json({
    success: true,
    labReportId: labReportId,
    group: situationRow?.groupid || group,
    bucket: bucket,
    situation: situationRow?.code || situation,
    situationId: situationRow?.id || null,
    message: "Follow-up visit recorded successfully"
  });
}
