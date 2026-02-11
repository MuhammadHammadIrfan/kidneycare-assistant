// pages/api/keep-alive.ts
// This endpoint is called by Vercel Cron to prevent Supabase from pausing
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is from cron-job.org using the secret
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Simple query to keep the database active
    const { data, error } = await supabaseAdmin
      .from("User")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Keep-alive query failed:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log("Keep-alive ping successful:", new Date().toISOString());
    
    return res.status(200).json({ 
      success: true, 
      message: "Database is active",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Keep-alive error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
}
