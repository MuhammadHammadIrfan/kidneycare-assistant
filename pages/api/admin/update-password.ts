import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    // Get user from cookies (same pattern as doctors.ts)
    const cookies = nookies.get({ req });
    const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
    const adminId = user?.id;
    const userRole = user?.role;

    if (!adminId || userRole !== "admin") {
      return res.status(401).json({ error: "Unauthorized: Admin access required" });
    }

    // Get current user from database using Supabase
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from("User")
      .select("id, name, email, passwordHash, role, active")
      .eq("id", adminId)
      .eq("role", "admin")
      .eq("active", true)
      .single();

    if (fetchError || !currentUser) {
      console.error("Admin user fetch error:", fetchError);
      return res.status(404).json({ error: "Admin user not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database using Supabase (removed updatedat)
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("User")
      .update({
        passwordHash: hashedNewPassword
      })
      .eq("id", adminId)
      .eq("role", "admin")
      .eq("active", true)
      .select("id, name, email")
      .single();

    if (updateError) {
      console.error("Password update error:", updateError);
      throw updateError;
    }

    console.log(`Admin password updated successfully for user: ${updatedUser.name} (${updatedUser.email})`);

    res.status(200).json({ 
      message: "Password updated successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}