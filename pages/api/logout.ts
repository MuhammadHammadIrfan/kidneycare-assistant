// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { AUTH_COOKIE_NAME } from "../../lib/authToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear the auth cookie by setting it to empty with immediate expiration
  res.setHeader(
    'Set-Cookie',
    serialize(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immediately
    })
  );

  return res.status(200).json({ success: true, message: "Logged out successfully" });
}
