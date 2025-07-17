import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if email already exists
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("User")
    .select("id")
    .eq("email", email);

  if (fetchError) return res.status(500).json({ error: "Database error" });
  if (existing && existing.length > 0) {
    return res.status(409).json({ error: "Email already exists" });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

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

  if (insertError) return res.status(500).json({ error: "Failed to register doctor" });

  return res.status(200).json({ success: true });
}