import { NextApiRequest, NextApiResponse } from "next";
import { findClosestLabReportWithMedication } from "../../../../../lib/medicationMatcher";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[CLOSEST_API] Starting closest medication API");
  
  if (req.method !== "POST") {
    console.log("[CLOSEST_API] Invalid method:", req.method);
    return res.status(405).end();
  }
  
  const { testValues } = req.body;
  console.log("[CLOSEST_API] Received test values:", testValues);
  
  if (!testValues) {
    console.log("[CLOSEST_API] Missing test values");
    return res.status(400).json({ error: "Missing test values" });
  }

  // Convert string values to proper types for classification
  const normalizedTestValues = {
    ...testValues,
    Echo: testValues.Echo === '1' || testValues.Echo === 1 || testValues.Echo === true,
    LARad: Number(testValues.LARad)
  };
  
  console.log("[CLOSEST_API] Normalized test values:", normalizedTestValues);

  try {
    // Find closest lab report with medication
    console.log("[CLOSEST_API] Searching for closest report...");
    const closestReport = await findClosestLabReportWithMedication(normalizedTestValues);
    
    if (!closestReport) {
      console.log("[CLOSEST_API] No closest report found, returning all medications with dosage 0");
      
      // Return all medication types with dosage 0
      const { data: medTypes, error: medTypesError } = await supabaseAdmin
        .from("MedicationType")
        .select("id, name, unit, groupname");
      
      console.log("[CLOSEST_API] Fetched medication types:", medTypes?.length || 0);
      if (medTypesError) {
        console.error("[CLOSEST_API] Error fetching medication types:", medTypesError);
        return res.status(500).json({ error: "Failed to fetch medication types" });
      }
      
      if (!medTypes || medTypes.length === 0) {
        console.log("[CLOSEST_API] No medication types found in database");
        return res.status(200).json({
          closest: null,
          medications: [],
          testResults: null,
          message: "No medication types configured in the system"
        });
      }
      
      const response = {
        closest: null,
        medications: medTypes.map(m => ({ ...m, dosage: 0 })),
        testResults: null
      };
      
      console.log("[CLOSEST_API] Returning response with", response.medications.length, "medications");
      return res.status(200).json(response);
    }

    console.log("[CLOSEST_API] Found closest report:", closestReport.id);

    // Get medication prescriptions for this report
    const { data: prescriptions, error: prescError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select("medicationtypeid, dosage")
      .eq("reportid", closestReport.id);

    console.log("[CLOSEST_API] Found prescriptions:", prescriptions?.length || 0);
    if (prescError) console.error("[CLOSEST_API] Error fetching prescriptions:", prescError);

    // Get all medication types
    const { data: medTypes, error: medTypesError } = await supabaseAdmin
      .from("MedicationType")
      .select("id, name, unit, groupname");

    console.log("[CLOSEST_API] Fetched medication types:", medTypes?.length || 0);
    if (medTypesError) console.error("[CLOSEST_API] Error fetching medication types:", medTypesError);

    // Merge prescriptions with med types
    const medications = (medTypes ?? []).map(mt => {
      const presc = prescriptions?.find(p => p.medicationtypeid === mt.id);
      return {
        ...mt,
        dosage: presc ? Number(presc.dosage) : 0
      };
    });

    console.log("[CLOSEST_API] Prepared medications with dosages:", medications.map(m => `${m.name}: ${m.dosage}`));

    // Get test results for the matched report with test type names
    const testResults: { [key: string]: number } = {};
    
    // First get all test types to map IDs to codes
    const { data: testTypes, error: testTypesError } = await supabaseAdmin
      .from("TestType")
      .select("id, code");
    
    console.log("[CLOSEST_API] Found test types:", testTypes?.length || 0);
    if (testTypesError) console.error("[CLOSEST_API] Error fetching test types:", testTypesError);
    
    // Create mapping from ID to code
    const testTypeMap = new Map();
    testTypes?.forEach(tt => testTypeMap.set(tt.id, tt.code));
    
    // Get test results through the proper relationship
    const { data: testResultsData, error: testResultsError } = await supabaseAdmin
      .from("LabReportTestLink")
      .select(`
        testresultid,
        TestResult!inner(testtypeid, value)
      `)
      .eq("labreportid", closestReport.id);
    
    console.log("[CLOSEST_API] Found test results links:", testResultsData?.length || 0);
    if (testResultsError) console.error("[CLOSEST_API] Error fetching test results:", testResultsError);
    
    for (const link of testResultsData || []) {
      const testResult = link.TestResult as any;
      if (testResult) {
        const testCode = testTypeMap.get(testResult.testtypeid);
        if (testCode) {
          testResults[testCode] = Number(testResult.value);
        }
      }
    }

    console.log("[CLOSEST_API] Extracted test results with codes:", testResults);

    const response = {
      closest: {
        id: closestReport.id,
        patientId: closestReport.patientid,
        reportDate: closestReport.reportdate
      },
      medications,
      testResults
    };

    console.log("[CLOSEST_API] Returning successful response with", medications.length, "medications");
    res.status(200).json(response);
    
  } catch (error) {
    console.error("[CLOSEST_API] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
