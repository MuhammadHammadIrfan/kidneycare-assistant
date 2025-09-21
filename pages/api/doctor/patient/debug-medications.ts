// pages/api/doctor/patient/debug-medications.ts - FIXED VERSION
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { reportId } = req.query;

  if (!reportId) {
    return res.status(400).json({ error: "Report ID is required" });
  }

  try {
    // Get all medications for this report with correct column names
    const { data: allMedications, error } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        medicationtypeid,
        dosage,
        isoutdated,
        outdatedat,
        outdatedreason,
        outdatedby,
        createdat,
        reportid,
        MedicationType (
          name,
          unit,
          groupname
        )
      `)
      .eq("reportid", reportId)            // lowercase
      .order("createdat", { ascending: false });

    if (error) {
      console.error("Debug medications error:", error);
      return res.status(500).json({ error: "Failed to fetch medications", details: error.message });
    }

    const activeMedications = allMedications?.filter(m => !m.isoutdated) || [];
    const outdatedMedications = allMedications?.filter(m => m.isoutdated) || [];

    res.status(200).json({
      reportId,
      total: allMedications?.length || 0,
      active: {
        count: activeMedications.length,
        medications: activeMedications
      },
      outdated: {
        count: outdatedMedications.length,
        medications: outdatedMedications
      },
      columnCheck: {
        hasIsOutdated: allMedications && allMedications.length > 0 ? 'isoutdated' in allMedications[0] : 'unknown',
        hasOutdatedAt: allMedications && allMedications.length > 0 ? 'outdatedat' in allMedications[0] : 'unknown',
        sampleRecord: allMedications && allMedications.length > 0 ? allMedications[0] : null
      }
    });

  } catch (error) {
    console.error("Debug API error:", error);
    res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" });
  }
}