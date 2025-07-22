import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { situationId } = req.query;
  if (!situationId) return res.status(400).json({ error: "Missing situationId" });

  // Fetch all questions and default options for this situation
  const { data, error } = await supabaseAdmin
    .from("RecommendationTemplate")
    .select(`
      questionid,
      defaultoptionid,
      Question:questionid (
        id,
        text,
        Options:Option (
          id,
          text
        )
      ),
      Option:defaultoptionid (
        id,
        text
      )
    `)
    .eq("situationid", situationId)
    .order("questionid", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to fetch recommendations" });

  // Format for frontend
  const recommendations = (data || []).map((rec: any) => ({
    questionId: rec.questionid,
    questionText: rec.Question?.text,
    options: rec.Question?.Options || [],
    defaultOptionId: rec.defaultoptionid,
    defaultOptionText: rec.Option?.text,
  }));

  res.status(200).json({ recommendations });
}
