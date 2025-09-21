import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[GET_SAVED_MEDICATIONS] Starting API");
  
  if (req.method !== "GET") {
    console.log("[GET_SAVED_MEDICATIONS] Invalid method:", req.method);
    return res.status(405).end();
  }
  
  const { labReportId } = req.query;
  console.log("[GET_SAVED_MEDICATIONS] Lab Report ID:", labReportId);
  
  if (!labReportId || typeof labReportId !== 'string') {
    console.log("[GET_SAVED_MEDICATIONS] Missing or invalid lab report ID");
    return res.status(400).json({ error: "Missing or invalid lab report ID" });
  }

  try {
    // Get ACTIVE saved medications for this report - FIXED
    const { data: savedMedications, error: medicationsError } = await supabaseAdmin
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
      .eq("reportid", labReportId)           // lowercase
      .eq("isoutdated", false)               // lowercase
      .order("createdat", { ascending: false });

    if (medicationsError) {
      console.error("Saved medications fetch error:", medicationsError);
      return res.status(500).json({ error: "Failed to fetch saved medications" });
    }

    // Also get outdated medications count for information
    const { data: outdatedCount } = await supabaseAdmin
      .from("MedicationPrescription")
      .select("id")
      .eq("reportid", labReportId)           // lowercase
      .eq("isoutdated", true);               // lowercase

    console.log(`[GET SAVED] Found ${savedMedications?.length || 0} active and ${outdatedCount?.length || 0} outdated medications`);

    // Transform the data to match the expected format
    const medications = (savedMedications || []).map(presc => {
      const medType = presc.MedicationType as any;
      return {
        id: medType.id,
        name: medType.name,
        unit: medType.unit,
        groupname: medType.groupname,
        dosage: Number(presc.dosage)
      };
    });

    console.log("[GET_SAVED_MEDICATIONS] Returning medications:", medications.length);
    res.status(200).json({
      success: true,
      medications,
      totalActive: savedMedications?.length || 0,
      totalOutdated: outdatedCount?.length || 0,
      message: `Found ${medications.length} active saved medications${
        outdatedCount?.length ? ` (${outdatedCount.length} outdated excluded)` : ''
      }`
    });
    
  } catch (error) {
    console.error("[GET_SAVED_MEDICATIONS] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
