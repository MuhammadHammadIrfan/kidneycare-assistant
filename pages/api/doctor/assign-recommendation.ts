import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const assignedById = user?.id;

  const { labReportId, answers } = req.body;
  // answers: [{ questionId, selectedOptionId }]

  if (!assignedById || !labReportId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Missing data" });
  }

  // Upsert each answer
  const records = answers.map((a: any) => ({
    labreportid: labReportId,
    questionid: a.questionId,
    selectedoptionid: a.selectedOptionId,
    assignedbyid: assignedById,
  }));

  // Use upsert to allow updates
const { error } = await supabaseAdmin
  .from("AssignedRecommendation")
  .upsert(records, { onConflict: "labreportid,questionid" });


  if (error) return res.status(500).json({ error: "Failed to save recommendations" });

  res.status(200).json({ success: true });
}
