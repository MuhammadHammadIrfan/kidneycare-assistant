import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { currentLabReportId } = req.body;

  if (!currentLabReportId) {
    return res.status(400).json({ error: "Lab report ID is required" });
  }

  try {
    console.log(`[PREVIOUS MEDICATIONS API] Fetching for lab report: ${currentLabReportId}`);

    // Get the current lab report to find the patient
    const { data: currentReport, error: currentReportError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id,
        patientid,
        reportdate,
        Patient (
          id,
          doctorid
        )
      `)
      .eq("id", currentLabReportId)
      .single();

    if (currentReportError || !currentReport) {
      console.error("Current lab report fetch error:", currentReportError);
      return res.status(404).json({ error: "Lab report not found" });
    }

    // Verify doctor access
    const patient = Array.isArray(currentReport.Patient) ? currentReport.Patient[0] : currentReport.Patient;
    if (!patient || patient.doctorid !== doctorId) {
      return res.status(403).json({ error: "Access denied" });
    }

    console.log(`[PREVIOUS MEDICATIONS API] Patient ID: ${currentReport.patientid}`);

    // Find the most recent previous lab report for this patient (before current report date)
    const { data: previousReports, error: previousReportsError } = await supabaseAdmin
      .from("LabReport")
      .select("id, reportdate")
      .eq("patientid", currentReport.patientid)
      .lt("reportdate", currentReport.reportdate)
      .order("reportdate", { ascending: false })
      .limit(1);

    if (previousReportsError) {
      console.error("Previous reports fetch error:", previousReportsError);
      return res.status(500).json({ error: "Failed to fetch previous reports" });
    }

    if (!previousReports || previousReports.length === 0) {
      console.log(`[PREVIOUS MEDICATIONS API] No previous reports found`);
      return res.status(200).json({
        medications: [],
        previousReport: null,
        message: "No previous medications found for this patient"
      });
    }

    const previousReport = previousReports[0];
    console.log(`[PREVIOUS MEDICATIONS API] Found previous report: ${previousReport.id}`);

    // Get ACTIVE medications prescribed in the previous report - FIXED
    const { data: previousMedications, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        medicationtypeid,
        dosage,
        createdat,
        isoutdated,
        outdatedat,
        outdatedreason,
        MedicationType (
          id,
          name,
          unit,
          groupname
        )
      `)
      .eq("reportid", previousReport.id)
      .eq("isoutdated", false) // Only get active medications
      .order("createdat", { ascending: false });

    if (medicationsError) {
      console.error("Previous medications fetch error:", medicationsError);
      return res.status(500).json({ error: "Failed to fetch previous medications" });
    }

    // Also get count of outdated medications for information
    const { data: outdatedMedications, error: outdatedError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select("id, outdatedat, outdatedreason")
      .eq("reportid", previousReport.id)
      .eq("isoutdated", true); // Get outdated medications

    console.log(`[PREVIOUS MEDICATIONS] Found ${previousMedications?.length || 0} active and ${outdatedMedications?.length || 0} outdated medications`);

    // Process medications to handle array responses
    const processedMedications = (previousMedications || []).map(med => {
      const medicationType = Array.isArray(med.MedicationType) ? med.MedicationType[0] : med.MedicationType;
      return {
        id: med.id,
        medicationtypeid: med.medicationtypeid,
        dosage: med.dosage,
        createdat: med.createdat,
        MedicationType: medicationType
      };
    }).filter(med => med.MedicationType !== null);

    console.log(`[PREVIOUS MEDICATIONS API] Found ${processedMedications.length} previous medications`);

    res.status(200).json({
      medications: processedMedications,
      previousReport: {
        id: previousReport.id,
        reportdate: previousReport.reportdate
      },
      outdatedInfo: {
        count: outdatedMedications?.length || 0,
        medications: outdatedMedications || [],
        hasOutdated: (outdatedMedications?.length || 0) > 0
      },
      message: `Found ${processedMedications.length} active medications from previous visit${
        outdatedMedications?.length ? ` (${outdatedMedications.length} outdated medications excluded)` : ''
      }`
    });

  } catch (error) {
    console.error("[PREVIOUS MEDICATIONS API] Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}