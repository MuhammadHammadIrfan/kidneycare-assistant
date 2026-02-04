import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../../../lib/authToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Get authenticated admin from secure JWT token
  const user = requireAdmin(req, res);
  if (!user) return; // Response already sent by requireAdmin

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if email already exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("email", email);

    if (fetchError) {
      console.error("[REGISTER DOCTOR] Database error:", fetchError);
      return res.status(500).json({ error: "Database error" });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert doctor user
    const { error: insertError } = await supabaseAdmin
      .from("User")
      .insert([
        {
          name,
          email,
          passwordHash,
          role: "doctor",
        },
      ]);

    if (insertError) {
      console.error("[REGISTER DOCTOR] Insert error:", insertError);
      return res.status(500).json({ error: "Failed to register doctor" });
    }

    return res.status(200).json({ success: true, message: "Doctor registered successfully" });

  } catch (error) {
    console.error("[REGISTER DOCTOR] Unexpected error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}