import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  const { patientId } = req.query;

  console.log('Recommendation history API called with:', { patientId, doctorId });

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }
  
  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    // First, verify the patient exists and belongs to this doctor
    // Using lowercase column names to match actual database
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from("Patient")
      .select("id, name, age, gender, nationalid, contactinfo, doctorid")
      .eq("id", patientId)
      .eq("doctorid", doctorId)
      .single();

    if (patientError || !patientData) {
      console.error("Patient verification error:", patientError);
      return res.status(404).json({ error: "Patient not found" });
    }

    console.log('Patient verified:', patientData.name);

    // Get all lab reports for this patient (ordered by date)
    // Using lowercase column names
    const { data: labReports, error: reportsError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id,
        reportdate,
        notes,
        situationid
      `)
      .eq("patientid", patientId)
      .order("reportdate", { ascending: false });

    if (reportsError) {
      console.error("Lab reports fetch error:", reportsError);
      return res.status(500).json({ error: "Failed to fetch patient reports" });
    }

    console.log(`Found ${labReports?.length || 0} lab reports`);

    // Process each lab report to build visit history
    const visitHistory = [];

    for (const report of labReports || []) {
      console.log(`Processing report ${report.id} from ${report.reportdate}`);

      // Initialize empty arrays for this report
      let enrichedRecommendations: any[] = [];
      let enrichedTestResults: any[] = [];

      // Get situation data if available
      let situationData = null;
      if (report.situationid) {
        const { data: situation, error: situationError } = await supabaseAdmin
          .from("Situation")
          .select("id, groupid, code, description")
          .eq("id", report.situationid)
          .single();

        if (!situationError && situation) {
          situationData = situation;
        }
      }

      // Get recommendations for this specific lab report from AssignedRecommendation table
      const { data: recommendations, error: recError } = await supabaseAdmin
        .from("AssignedRecommendation")
        .select("id, questionid, selectedoptionid")
        .eq("labreportid", report.id);

      console.log(`Found ${recommendations?.length || 0} recommendations for report ${report.id}`);

      // Get Question and Option details for recommendations
      if (recommendations && recommendations.length > 0) {
        const questionIds = [...new Set(recommendations.map((r: any) => r.questionid))];
        const optionIds = [...new Set(recommendations.map((r: any) => r.selectedoptionid))];

        // Get Questions
        const { data: questions } = await supabaseAdmin
          .from("Question")
          .select("id, text")
          .in("id", questionIds);

        // Get Options
        const { data: options } = await supabaseAdmin
          .from("Option")
          .select("id, text")
          .in("id", optionIds);

        // Create lookup maps
        const questionMap: Record<number, any> = {};
        questions?.forEach((q: any) => {
          questionMap[q.id] = q;
        });

        const optionMap: Record<number, any> = {};
        options?.forEach((o: any) => {
          optionMap[o.id] = o;
        });

        // Enrich recommendations
        enrichedRecommendations = recommendations.map((rec: any) => ({
          id: rec.id,
          questionid: rec.questionid,
          selectedoptionid: rec.selectedoptionid,
          Question: questionMap[rec.questionid] || null,
          Option: optionMap[rec.selectedoptionid] || null
        }));
      }

      // Get test results for this specific lab report using LabReportTestLink
      console.log(`Getting test results for report ${report.id} via LabReportTestLink`);
      
      const { data: testLinks, error: linksError } = await supabaseAdmin
        .from("LabReportTestLink")
        .select("testresultid")
        .eq("labreportid", report.id);

      console.log(`Test links query result:`, { 
        count: testLinks?.length || 0,
        error: linksError,
        reportId: report.id 
      });

      if (linksError) {
        console.error(`Links error for report ${report.id}:`, linksError);
      } else if (testLinks && testLinks.length > 0) {
        // Get the actual test results using the IDs from the link table
        const testResultIds = testLinks.map((link: any) => link.testresultid);
        
        console.log(`Querying TestResult for IDs:`, testResultIds);
        
        const { data: testResults, error: testsError } = await supabaseAdmin
          .from("TestResult")
          .select(`
            id,
            value,
            testdate,
            testtypeid
          `)
          .in("id", testResultIds)
          .order("testtypeid", { ascending: true }); // ← Order by TestType ID for consistency

        console.log(`Test results query result:`, { 
          count: testResults?.length || 0, 
          error: testsError 
        });

        if (testsError) {
          console.error(`Test results fetch error for report ${report.id}:`, testsError);
        } else if (testResults && testResults.length > 0) {
          // Get TestType details for test results
          const testTypeIds = [...new Set(testResults.map((t: any) => t.testtypeid))];

          console.log(`Querying TestType for IDs:`, testTypeIds);

          const { data: testTypes } = await supabaseAdmin
            .from("TestType")
            .select("id, code, name, unit")
            .in("id", testTypeIds)
            .order("id", { ascending: true }); // ← Order TestTypes by ID as well

          console.log(`TestType query result:`, { count: testTypes?.length || 0 });

          const testTypeMap: Record<number, any> = {};
          testTypes?.forEach((tt: any) => {
            testTypeMap[tt.id] = tt;
          });

          // Enrich test results with TestType information and maintain order
          enrichedTestResults = testResults.map((test: any) => ({
            id: test.id,
            value: test.value,
            testdate: test.testdate,
            testtypeid: test.testtypeid,
            TestType: testTypeMap[test.testtypeid] || null
          }));

          // Additional sorting to ensure consistent order based on TestType code
          enrichedTestResults.sort((a, b) => {
            // Define the preferred order of test codes
            const testOrder = ['PTH', 'Ca', 'Albumin', 'CaCorrected', 'Phos', 'Echo', 'LARad'];
            
            const aCode = a.TestType?.code || '';
            const bCode = b.TestType?.code || '';
            
            const aIndex = testOrder.indexOf(aCode);
            const bIndex = testOrder.indexOf(bCode);
            
            // If both codes are in the preferred order, sort by their position
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            
            // If only one is in the preferred order, it comes first
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            
            // If neither is in the preferred order, sort alphabetically by code
            return aCode.localeCompare(bCode);
          });

          console.log(`Enriched and sorted ${enrichedTestResults.length} test results for report ${report.id}`);
        }
      }

      // Add to visit history
      visitHistory.push({
        id: report.id,
        visitDate: report.reportdate,
        notes: report.notes || "",
        situation: situationData,
        recommendations: enrichedRecommendations,
        testResults: enrichedTestResults
      });
    }

    console.log(`Returning ${visitHistory.length} visits in history`);

    res.status(200).json({
      patient: patientData,
      visitHistory
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}