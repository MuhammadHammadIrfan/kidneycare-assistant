import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireDoctor } from "../../../../lib/authToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get authenticated doctor from secure JWT token
  const user = requireDoctor(req, res);
  if (!user) return; // Response already sent by requireDoctor
  
  const doctorId = user.id;

  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    console.log(`[PATIENT HISTORY API] Fetching history for patient: ${patientId}`);

    // Verify patient belongs to this doctor
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("Patient")
      .select("id, name, doctorid")
      .eq("id", patientId)
      .eq("doctorid", doctorId)
      .single();

    if (patientError || !patient) {
      console.error("Patient verification error:", patientError);
      return res.status(404).json({ error: "Patient not found or access denied" });
    }

    // Get all lab reports for this patient with situation details
    // In patient-history.ts - Update the Situation select to include bucketid
    const { data: labReports, error: reportsError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id,
        reportdate,
        notes,
        situationid,
        createdat,
        lastmodified,
        lastmodifiedby,
        Situation (
          id,
          groupid,
          bucketid,
          code,
          description
        )
      `)
      .eq("patientid", patientId)
      .order("reportdate", { ascending: false });

    if (reportsError) {
      console.error("Lab reports fetch error:", reportsError);
      return res.status(500).json({ error: "Failed to fetch lab reports" });
    }

    console.log(`[PATIENT HISTORY API] Found ${labReports?.length || 0} lab reports`);

    // For each lab report, get test results, recommendations, AND medications
    const visitHistory = await Promise.all(
      (labReports || []).map(async (report) => {
        // Get test results via LabReportTestLink - Fixed: Handle array response properly
        const { data: testLinks, error: testLinksError } = await supabaseAdmin
          .from("LabReportTestLink")
          .select(`
            testresultid,
            TestResult (
              id,
              value,
              testdate,
              testtypeid,
              lastmodified,
              lastmodifiedby,
              createdat,
              TestType!TestResult_testtypeid_fkey (
                id,
                code,
                name,
                unit
              )
            )
          `)
          .eq("labreportid", report.id);

        if (testLinksError) {
          console.error(`Test links fetch error for report ${report.id}:`, testLinksError);
        }

        // Extract test results from the links - Fixed: Handle both array and single object responses
        const testResults = (testLinks || [])
          .map(link => {
            const testResult = link.TestResult;
            if (!testResult) return null;
            
            // Handle case where TestResult might be an array (shouldn't happen with single foreign key, but just in case)
            const result = Array.isArray(testResult) ? testResult[0] : testResult;
            if (!result) return null;

            // Handle case where TestType might be an array
            const testType = Array.isArray(result.TestType) ? result.TestType[0] : result.TestType;
            
            return {
              ...result,
              TestType: testType
            };
          })
          .filter(result => result !== null);

        // Get assigned recommendations for this lab report
        const { data: recommendations, error: recommendationsError } = await supabaseAdmin
          .from("AssignedRecommendation")
          .select(`
            id,
            questionid,
            selectedoptionid,
            Question (
              id,
              text
            ),
            Option (
              id,
              text
            )
          `)
          .eq("labreportid", report.id);

        if (recommendationsError) {
          console.error(`Recommendations fetch error for report ${report.id}:`, recommendationsError);
        }

        // Handle recommendations that might have array responses
        const processedRecommendations = (recommendations || []).map(rec => ({
          ...rec,
          Question: Array.isArray(rec.Question) ? rec.Question[0] : rec.Question,
          Option: Array.isArray(rec.Option) ? rec.Option[0] : rec.Option
        }));

        // Get medications for this lab report - NEW
        const { data: medications, error: medicationsError } = await supabaseAdmin
          .from("MedicationPrescription")
          .select(`
            id,
            dosage,
            isoutdated,
            createdat,
            outdatedat,
            outdatedreason,
            outdatedby,
            MedicationType (
              id,
              name,
              unit,
              groupname
            )
          `)
          .eq("reportid", report.id)
          .order("createdat", { ascending: false });

        if (medicationsError) {
          console.error(`Medications fetch error for report ${report.id}:`, medicationsError);
        }

        // Process medications (handle array responses if needed)
        const processedMedications = (medications || []).map(med => ({
          ...med,
          MedicationType: Array.isArray(med.MedicationType) ? med.MedicationType[0] : med.MedicationType
        }));

        // Get medication status for this report - FIXED COLUMN NAMES
        const { data: medicationStatus, error: medStatusError } = await supabaseAdmin
          .from("MedicationPrescription")
          .select("id, isoutdated, dosage")      // lowercase column names
          .eq("reportid", report.id);            // lowercase

        const activeMedications = medicationStatus?.filter(m => !m.isoutdated) || [];
        const outdatedMedications = medicationStatus?.filter(m => m.isoutdated) || [];

        return {
          id: report.id,
          visitDate: report.reportdate,
          notes: report.notes || "",
          situation: Array.isArray(report.Situation) ? report.Situation[0] : report.Situation,
          createdat: report.createdat,
          lastmodified: report.lastmodified,
          lastmodifiedby: report.lastmodifiedby,
          testResults: testResults || [],
          recommendations: processedRecommendations || [],
          medications: processedMedications || [], // NEW
          medicationStatus: {
            hasActive: activeMedications.length > 0,
            hasOutdated: outdatedMedications.length > 0,
            activeCount: activeMedications.length,
            outdatedCount: outdatedMedications.length
          }
        };
      })
    );

    console.log(`[PATIENT HISTORY API] Processed ${visitHistory.length} visits with complete data`);

    res.status(200).json({
      patient: {
        id: patient.id,
        name: patient.name
      },
      visitHistory,
      totalVisits: visitHistory.length
    });

  } catch (error) {
    console.error("[PATIENT HISTORY API] Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}