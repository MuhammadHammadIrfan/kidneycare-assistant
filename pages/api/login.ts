import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, role } = req.body;

  // Fetch user by email and role
  const { data: users, error } = await supabaseAdmin
    .from("User")
    .select("*")
    .eq("email", email)
    .eq("role", role);

  if (error || !users || users.length === 0) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = users[0];
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Return user info (never send passwordHash)
  return res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}