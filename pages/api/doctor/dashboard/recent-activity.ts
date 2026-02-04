// pages/api/doctor/dashboard/recent-activity.ts
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

  try {
    // 1. RECENT LAB REPORTS (Last 10)
    const { data: recentReports, error: reportsError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id,
        reportdate,
        createdat,
        Patient (
          id,
          name,
          age,
          gender
        ),
        Situation (
          groupid,
          bucketid,
          code,
          description
        )
      `)
      .eq("doctorid", doctorId)
      .order("reportdate", { ascending: false })
      .limit(10);

    // 2. RECENT MEDICATIONS (Last 10)
    const { data: recentMedications, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        dosage,
        createdat,
        MedicationType (
          name,
          unit
        ),
        LabReport!MedicationPrescription_reportid_fkey (
          reportdate,
          Patient (
            name
          )
        )
      `)
      .eq("LabReport.doctorid", doctorId)
      .order("createdat", { ascending: false })
      .limit(10);

    // 3. CRITICAL TEST VALUES (Recent reports with extreme values)
    const { data: criticalTests, error: criticalError } = await supabaseAdmin
      .from("LabReportTestLink")
      .select(`
        TestResult (
          value,
          testdate,
          TestType (
            name,
            code,
            unit
          )
        ),
        LabReport!LabReportTestLink_labreportid_fkey (
          reportdate,
          Patient (
            name
          )
        )
      `)
      .eq("LabReport.doctorid", doctorId)
      .order("LabReport.reportdate", { ascending: false })
      .limit(50); // Get more to filter for critical values

    // Filter for critical values
    const criticalAlerts = criticalTests
      ?.map(link => {
        const testResult = Array.isArray(link.TestResult) ? link.TestResult[0] : link.TestResult;
        const labReport = Array.isArray(link.LabReport) ? link.LabReport[0] : link.LabReport;
        
        if (!testResult || !labReport) return null;

        const testType = Array.isArray(testResult.TestType) ? testResult.TestType[0] : testResult.TestType;
        const patient = Array.isArray(labReport.Patient) ? labReport.Patient[0] : labReport.Patient;
        
        if (!testType || !patient) return null;

        // Define critical ranges
        const criticalRanges = {
          PTH: { min: 50, max: 600 },
          Ca: { min: 6.0, max: 12.0 },
          CaCorrected: { min: 6.0, max: 12.0 },
          Phos: { min: 2.0, max: 7.0 }
        };

        const range = criticalRanges[testType.code as keyof typeof criticalRanges];
        if (!range) return null;

        const isCritical = testResult.value < range.min || testResult.value > range.max;
        if (!isCritical) return null;

        return {
          patientName: patient.name,
          testName: testType.name,
          testCode: testType.code,
          value: testResult.value,
          unit: testType.unit,
          reportDate: labReport.reportdate,
          severity: testResult.value < range.min ? 'low' : 'high'
        };
      })
      .filter(Boolean)
      .slice(0, 5); // Top 5 critical alerts

    const activity = {
      recentReports: recentReports || [],
      recentMedications: recentMedications || [],
      criticalAlerts: criticalAlerts || []
    };

    res.status(200).json({ success: true, activity });

  } catch (error) {
    console.error("[RECENT ACTIVITY API] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch recent activity",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}