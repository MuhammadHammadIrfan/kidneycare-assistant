import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireDoctor } from "../../../../lib/authToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Get authenticated doctor from secure JWT token
  const user = requireDoctor(req, res);
  if (!user) return; // Response already sent by requireDoctor
  
  const doctorId = user.id;
  const { nationalId } = req.query;
  
  if (!nationalId) {
    return res.status(400).json({ error: "National ID is required" });
  }

  // Search for patient by nationalId
  const { data: patientData, error: patientError } = await supabaseAdmin
    .from("Patient")
    .select(`
      id,
      name,
      age,
      gender,
      nationalid,
      contactinfo,
      doctorid,
      createdat
    `)
    .eq("nationalid", nationalId)
    .single();

  if (patientError) {
    if (patientError.code === 'PGRST116') {
      return res.status(404).json({ error: "Patient not found" });
    }
    console.error("Patient search error:", patientError);
    return res.status(500).json({ error: "Database error" });
  }

  if (!patientData) {
    return res.status(404).json({ error: "Patient not found" });
  }
  console.log("Patient found:", patientData);

  // Check if this doctor has access to this patient
  if (patientData.doctorid !== doctorId) {
    return res.status(403).json({ error: "Access denied: This patient belongs to another doctor" });
  }

  // Get patient's most recent lab report
  const { data: recentReport, error: reportError } = await supabaseAdmin
    .from("LabReport")
    .select(`
      id,
      reportdate,
      notes,
      situationid
    `)
    .eq("patientid", patientData.id)
    .order("reportdate", { ascending: false })
    .limit(1);

  if (reportError) {
    console.error("Report fetch error:", reportError);
    return res.status(500).json({ error: "Failed to fetch patient reports" });
  }

  // If we have a report with situationid, fetch the situation details separately
  let situationData = null;
  if (recentReport && recentReport.length > 0 && recentReport[0].situationid) {
    const { data: situation, error: situationError } = await supabaseAdmin
      .from("Situation")
      .select("id, groupid, code, description")
      .eq("id", recentReport[0].situationid)
      .single();
    
    if (!situationError && situation) {
      situationData = situation;
    }
  }

  // Get patient's most recent test results
  const { data: recentTests, error: testsError } = await supabaseAdmin
    .from("TestResult")
    .select(`
      id,
      value,
      testdate,
      testtypeid
    `)
    .eq("patientid", patientData.id)
    .order("testdate", { ascending: false })
    .limit(10); // Get last 10 test results

  if (testsError) {
    console.error("Tests fetch error:", testsError);
    return res.status(500).json({ error: "Failed to fetch patient test results" });
  }

  // Get test type details for the recent tests
  let enrichedTests: any[] = [];
  if (recentTests && recentTests.length > 0) {
    const testTypeIds = [...new Set(recentTests.map((test: any) => test.testtypeid))];
    
    const { data: testTypes, error: testTypesError } = await supabaseAdmin
      .from("TestType")
      .select("id, code, name, unit")
      .in("id", testTypeIds);

    if (!testTypesError && testTypes) {
      // Map test types by id for easy lookup
      const testTypeMap: Record<number, any> = {};
      testTypes.forEach((testType: any) => {
        testTypeMap[testType.id] = testType;
      });

      // Enrich tests with test type information
      enrichedTests = recentTests.map((test: any) => ({
        ...test,
        TestType: testTypeMap[test.testtypeid] || null
      }));
    } else {
      enrichedTests = recentTests;
    }
  }

  return res.status(200).json({
    patient: patientData,
    recentReport: recentReport && recentReport.length > 0 ? {
      ...recentReport[0],
      Situation: situationData
    } : null,
    recentTests: enrichedTests
  });
}
