// Replace the entire file:

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }

  const { labReportId, recommendations } = req.body;

  console.log('Assign recommendation API called with:', { 
    labReportId, 
    recommendationsCount: recommendations?.length,
    recommendations 
  });

  // Validate required data
  if (!labReportId) {
    return res.status(400).json({ error: "Lab Report ID is required" });
  }

  if (!recommendations || !Array.isArray(recommendations)) {
    return res.status(400).json({ error: "Recommendations array is required" });
  }

  // If recommendations array is empty, that's valid (no recommendations to save)
  if (recommendations.length === 0) {
    console.log('No recommendations to save - this is valid');
    return res.status(200).json({ 
      success: true, 
      message: "No recommendations to save",
      savedRecommendations: []
    });
  }

  // Validate each recommendation has required fields
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    if (!rec.questionId || !rec.selectedOptionId) {
      return res.status(400).json({ 
        error: `Invalid recommendation at index ${i}: missing questionId or selectedOptionId` 
      });
    }
  }

  try {
    // First, delete any existing recommendations for this lab report
    const { error: deleteError } = await supabaseAdmin
      .from("AssignedRecommendation")
      .delete()
      .eq("labreportid", labReportId);

    if (deleteError) {
      console.error("Error deleting existing recommendations:", deleteError);
      return res.status(500).json({ error: "Failed to clear existing recommendations" });
    }

    // Insert new recommendations
    const recommendationInserts = recommendations.map((rec: any) => ({
      labreportid: labReportId,
      questionid: rec.questionId,
      selectedoptionid: rec.selectedOptionId,
      assignedbyid: doctorId,
      createdat: new Date().toISOString()
    }));

    console.log('Inserting recommendations:', recommendationInserts);

    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from("AssignedRecommendation")
      .insert(recommendationInserts)
      .select("id, questionid, selectedoptionid");

    if (insertError) {
      console.error("Error inserting recommendations:", insertError);
      return res.status(500).json({ error: "Failed to save recommendations" });
    }

    console.log('Successfully saved recommendations:', insertedData);

    res.status(200).json({
      success: true,
      savedRecommendations: insertedData || []
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}