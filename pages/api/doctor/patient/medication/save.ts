import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[SAVE_API] Starting save medication API");
  
  if (req.method !== "POST") {
    console.log("[SAVE_API] Invalid method:", req.method);
    return res.status(405).end();
  }
  
  const { reportId, medications } = req.body;
  console.log("[SAVE_API] Received reportId:", reportId);
  console.log("[SAVE_API] Received medications:", medications?.length || 0, "items");
  
  if (!reportId || !Array.isArray(medications)) {
    console.log("[SAVE_API] Missing reportId or medications array");
    return res.status(400).json({ error: "Missing reportId or medications" });
  }

  try {
    console.log("[SAVE_API] Deleting existing prescriptions for reportId:", reportId);
    
    // Remove existing prescriptions for this report
    const { error: deleteError } = await supabaseAdmin
      .from("MedicationPrescription")
      .delete()
      .eq("reportid", reportId);
    
    if (deleteError) {
      console.error("[SAVE_API] Error deleting existing prescriptions:", deleteError);
      return res.status(500).json({ error: "Failed to clear existing medications" });
    }

    // Filter medications with dosage > 0 to only save those
    const medicationsToSave = medications.filter((m: any) => Number(m.dosage) > 0);
    console.log("[SAVE_API] Medications to save (dosage > 0):", medicationsToSave.length);

    if (medicationsToSave.length > 0) {
      // Insert new prescriptions
      const inserts = medicationsToSave.map((m: any) => ({
        reportid: reportId,
        medicationtypeid: m.id,
        dosage: Number(m.dosage)
      }));
      
      console.log("[SAVE_API] Inserting prescriptions:", inserts);
      
      const { error: insertError } = await supabaseAdmin
        .from("MedicationPrescription")
        .insert(inserts);
      
      if (insertError) {
        console.error("[SAVE_API] Error inserting prescriptions:", insertError);
        return res.status(500).json({ error: "Failed to save medications" });
      }
      
      console.log("[SAVE_API] Successfully saved", inserts.length, "medication prescriptions");
    } else {
      console.log("[SAVE_API] No medications with dosage > 0 to save");
    }
    
    console.log("[SAVE_API] Save operation completed successfully");
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error("[SAVE_API] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
