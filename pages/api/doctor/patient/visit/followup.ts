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
    .select("id")
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
  const { data: testTypes } = await supabaseAdmin.from("TestType").select("id,code");
  const codeToId: Record<string, number> = {};
  testTypes?.forEach((tt: any) => { codeToId[tt.code] = tt.id; });

  const testInserts = Object.entries(testValues)
    .filter(([code, value]) => value !== "" && codeToId[code])
    .map(([code, value]) => ({
      patientid: patientId,
      testtypeid: codeToId[code],
      value: parseFloat(value as string),
      testdate: new Date().toISOString(),
      enteredbyid: doctorId,
    }));

  console.log("Follow-up test inserts:", testInserts);

  let testResultIds: string[] = [];
  if (testInserts.length > 0) {
    const { data: testResultData, error: testError } = await supabaseAdmin
      .from("TestResult")
      .insert(testInserts)
      .select("id");

    if (testError) {
      console.error("Test results insertion error:", testError);
      return res.status(500).json({ error: "Failed to save test results" });
    }
    testResultIds = (testResultData || []).map((tr: any) => tr.id);
  }

  // 3. Link test results to lab report
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
  }

  return res.status(200).json({
    success: true,
    patientId,
    labReportId,
    group,
    bucket,
    situation,
    situationId,
  });
}
