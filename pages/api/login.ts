import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import bcrypt from "bcryptjs";
import { serialize } from "cookie";
import { 
  createAuthToken, 
  AUTH_COOKIE_NAME, 
  AUTH_COOKIE_OPTIONS,
  TokenPayload 
} from "../../lib/authToken";

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
  
  // Check if user is active
  if (user.active === false) {
    return res.status(401).json({ error: "Account is deactivated" });
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Create secure JWT token
  const tokenPayload: TokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  
  const token = createAuthToken(tokenPayload);
  
  // Set HTTP-only cookie (cannot be accessed by JavaScript - prevents XSS)
  res.setHeader(
    'Set-Cookie',
    serialize(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)
  );

  // Return user info for client-side UI (role needed for routing)
  // Note: This data is just for UI display, actual auth is in the HTTP-only cookie
  return res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}