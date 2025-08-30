import { supabaseAdmin } from "../lib/supabaseAdmin";
import { classifyPatientSituation } from "../lib/classify";

/**
 * Find the closest lab report (with medication) to the given test values.
 * Priority: group -> bucket -> closest CaCorrected/Phos
 */
export async function findClosestLabReportWithMedication(testValues: { PTH: number; Ca: number; CaCorrected: number; Phos: number; Echo: boolean; LARad: number; [key: string]: any }) {
  console.log("[MEDICATION_MATCHER] Starting search with test values:", testValues);
  
  // 1. Classify the current test values
  const { group, bucket } = classifyPatientSituation(testValues);
  console.log("[MEDICATION_MATCHER] Current classification - Group:", group, "Bucket:", bucket);

  // 2. Get all lab reports that have a medication prescription (DISTINCT)
  const { data: reportsWithMed, error: medError } = await supabaseAdmin
    .from("MedicationPrescription")
    .select("reportid")
    .not("reportid", "is", null);
  
  console.log("[MEDICATION_MATCHER] Reports with medications (raw):", reportsWithMed?.length || 0);
  if (medError) console.error("[MEDICATION_MATCHER] Error fetching medication prescriptions:", medError);
  
  if (!reportsWithMed || reportsWithMed.length === 0) {
    console.log("[MEDICATION_MATCHER] No medication prescriptions found, returning null");
    return null;
  }
  
  // Get unique/distinct report IDs
  const reportIds = [...new Set(reportsWithMed.map((r) => r.reportid))];
  console.log("[MEDICATION_MATCHER] Distinct Report IDs with medications:", reportIds);

  // 3. First, get the TestType IDs for CaCorrected and Phos from the schema
  const { data: testTypes, error: testTypeError } = await supabaseAdmin
    .from("TestType")
    .select("id, code")
    .in("code", ["CaCorrected", "Phos"]);
  
  console.log("[MEDICATION_MATCHER] Test types:", testTypes);
  if (testTypeError) console.error("[MEDICATION_MATCHER] Error fetching test types:", testTypeError);
  
  const caCorrectedId = testTypes?.find(t => t.code === "CaCorrected")?.id;
  const phosId = testTypes?.find(t => t.code === "Phos")?.id;
  console.log("[MEDICATION_MATCHER] CaCorrected ID:", caCorrectedId, "Phos ID:", phosId);

  // 4. Fetch lab reports with their test results using LabReportTestLink
  const { data: labReports, error: reportsError } = await supabaseAdmin
    .from("LabReport")
    .select(`
      id, 
      situationid, 
      patientid, 
      reportdate, 
      Situation!situationid(groupid, bucketid),
      LabReportTestLink!labreportid(
        testresultid,
        TestResult!testresultid(testtypeid, value)
      )
    `)
    .in("id", reportIds);
  
  console.log("[MEDICATION_MATCHER] Lab reports fetched:", labReports?.length || 0);
  if (reportsError) console.error("[MEDICATION_MATCHER] Error fetching lab reports:", reportsError);
  
  if (!labReports || labReports.length === 0) {
    console.log("[MEDICATION_MATCHER] No lab reports found");
    return null;
  }

  // 5. Process each report to find the best match
  let best = null;
  let bestScore = Infinity;
  
  for (const report of labReports) {
    console.log("[MEDICATION_MATCHER] Processing report:", report.id);
    
    // Get group and bucket from Situation - should be an object, not an array
    const reportGroup = (report.Situation as any)?.groupid;
    const reportBucket = (report.Situation as any)?.bucketid;
    console.log("[MEDICATION_MATCHER] Report", report.id, "- Group:", reportGroup, "Bucket:", reportBucket);
    
    // Get CaCorrected and Phos from TestResults via LabReportTestLink
    let caCorr = null, phos = null;
    
    for (const link of (report.LabReportTestLink as any) || []) {
      const testResult = (link.TestResult as any); // TestResult should be an object, not array
      if (testResult?.testtypeid === caCorrectedId) {
        caCorr = Number(testResult.value);
      }
      if (testResult?.testtypeid === phosId) {
        phos = Number(testResult.value);
      }
    }
    
    console.log("[MEDICATION_MATCHER] Report", report.id, "- CaCorrected:", caCorr, "Phos:", phos);
    
    if (caCorr == null || phos == null) {
      console.log("[MEDICATION_MATCHER] Skipping report", report.id, "- missing CaCorrected or Phos");
      continue;
    }
    
    // Calculate similarity score - Priority: group match, then bucket match, then value closeness
    let score = 0;
    if (reportGroup !== group) score += 1000; // penalize group mismatch
    if (reportBucket !== bucket) score += 100; // penalize bucket mismatch
    score += Math.abs(caCorr - testValues.CaCorrected) + Math.abs(phos - testValues.Phos);
    
    console.log("[MEDICATION_MATCHER] Report", report.id, "- Score:", score, "Current best:", bestScore);
    
    if (score < bestScore) {
      bestScore = score;
      best = report;
      console.log("[MEDICATION_MATCHER] New best match:", report.id, "with score:", score);
    }
  }
  
  console.log("[MEDICATION_MATCHER] Final best report:", best?.id || "none", "with score:", bestScore);
  return best;
}
