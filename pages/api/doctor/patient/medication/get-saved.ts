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
    // Get saved medication prescriptions for this lab report
    const { data: prescriptions, error: prescError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        medicationtypeid,
        dosage,
        MedicationType!inner(id, name, unit, groupname)
      `)
      .eq("reportid", labReportId)
      .gt("dosage", 0); // Only get medications with dosage > 0

    console.log("[GET_SAVED_MEDICATIONS] Found prescriptions:", prescriptions?.length || 0);
    if (prescError) {
      console.error("[GET_SAVED_MEDICATIONS] Error fetching prescriptions:", prescError);
      return res.status(500).json({ error: "Failed to fetch medication prescriptions" });
    }

    // Transform the data to match the expected format
    const medications = (prescriptions || []).map(presc => {
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
    res.status(200).json({ medications });
    
  } catch (error) {
    console.error("[GET_SAVED_MEDICATIONS] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
