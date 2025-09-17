import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import nookies from "nookies";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const adminId = user?.id;
  const userRole = user?.role;

  if (!adminId || userRole !== "admin") {
    return res.status(401).json({ error: "Unauthorized: Admin access required" });
  }

  if (req.method === "GET") {
    // GET ALL DOCTORS WITH SEARCH - Updated column names
    try {
      const { search, includeInactive } = req.query;

      console.log('[API] GET doctors - includeInactive:', includeInactive);
      console.log('[API] GET doctors - search:', search);

      let query = supabaseAdmin
        .from("User")
        .select(`
          id,
          name,
          email,
          createdat,
          active,
          deactivatedat,
          role
        `)
        .order("createdat", { ascending: false });

      // Filter by role - include both active and inactive doctors
      if (includeInactive === "true") {
        query = query.in("role", ["doctor", "inactive_doctor"]);
        console.log('[API] Including both active and inactive doctors');
      } else {
        query = query.eq("role", "doctor").eq("active", true);
        console.log('[API] Only including active doctors');
      }

      if (search && typeof search === "string") {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: doctors, error: doctorsError } = await query;

      if (doctorsError) {
        console.error('[API] Doctors query error:', doctorsError);
        throw doctorsError;
      }

      console.log('[API] Found doctors:', doctors?.length || 0);
      console.log('[API] Active doctors:', doctors?.filter(d => d.active).length || 0);
      console.log('[API] Inactive doctors:', doctors?.filter(d => !d.active).length || 0);

      // Get additional stats for each doctor
      const doctorsWithStats = await Promise.all(
        (doctors || []).map(async (doctor) => {
          // Get patient count
          const { data: patients } = await supabaseAdmin
            .from("Patient")
            .select("id, createdat")
            .eq("doctorid", doctor.id);

          // Get lab reports count
          const { data: labReports } = await supabaseAdmin
            .from("LabReport")
            .select("id, reportdate")
            .eq("doctorid", doctor.id);

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const recentReports = labReports?.filter(r => 
            new Date(r.reportdate) >= thirtyDaysAgo
          ).length || 0;

          return {
            ...doctor,
            stats: {
              totalPatients: patients?.length || 0,
              totalReports: labReports?.length || 0,
              recentReports,
              isActive: recentReports > 0 && doctor.active !== false // Consider both active field and recent activity
            }
          };
        })
      );

      console.log('[API] Returning doctors with stats:', doctorsWithStats.length);
      res.status(200).json({ success: true, doctors: doctorsWithStats });

    } catch (error) {
      console.error("[ADMIN DOCTORS GET] Error:", error);
      res.status(500).json({ 
        error: "Failed to fetch doctors",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }

  } else if (req.method === "PUT") {
    // UPDATE DOCTOR OR REACTIVATE - Fixed column names
    try {
      const { doctorId, name, email, password, action } = req.body;

      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      // Handle reactivation
      if (action === 'reactivate') {
        // Verify doctor exists and is currently inactive
        const { data: existingDoctor, error: fetchError } = await supabaseAdmin
          .from("User")
          .select("id, name, email, role, active")
          .eq("id", doctorId)
          .eq("role", "inactive_doctor")
          .eq("active", false)
          .single();

        if (fetchError || !existingDoctor) {
          return res.status(404).json({ error: "Inactive doctor not found" });
        }

        // Reactivate doctor - Fixed column names
        const { data: reactivatedDoctor, error: reactivateError } = await supabaseAdmin
          .from("User")
          .update({
            active: true,
            role: "doctor",
            deactivatedat: null,        // lowercase
            deactivatedby: null         // lowercase
          })
          .eq("id", doctorId)
          .eq("role", "inactive_doctor")
          .select("id, name, email")
          .single();

        if (reactivateError) throw reactivateError;

        return res.status(200).json({ 
          success: true, 
          message: `Doctor ${reactivatedDoctor.name} has been reactivated successfully`,
          action: "reactivated",
          doctor: reactivatedDoctor
        });
      }

      // Handle regular update
      const { data: existingDoctor, error: fetchError } = await supabaseAdmin
        .from("User")
        .select("id, email, role, active")
        .eq("id", doctorId)
        .eq("role", "doctor")
        .eq("active", true)
        .single();

      if (fetchError || !existingDoctor) {
        return res.status(404).json({ error: "Active doctor not found" });
      }

      // Check if email is being changed and if it conflicts
      if (email && email !== existingDoctor.email) {
        const { data: emailCheck } = await supabaseAdmin
          .from("User")
          .select("id")
          .eq("email", email)
          .neq("id", doctorId);

        if (emailCheck && emailCheck.length > 0) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (password) {
        const saltRounds = 10;
        updateData.passwordHash = await bcrypt.hash(password, saltRounds); // This stays camelCase
      }

      // Update doctor
      const { data: updatedDoctor, error: updateError } = await supabaseAdmin
        .from("User")
        .update(updateData)
        .eq("id", doctorId)
        .eq("role", "doctor")
        .eq("active", true)
        .select("id, name, email, createdat")
        .single();

      if (updateError) throw updateError;

      res.status(200).json({ 
        success: true, 
        message: "Doctor updated successfully",
        doctor: updatedDoctor
      });

    } catch (error) {
      console.error("[ADMIN DOCTORS UPDATE/REACTIVATE] Error:", error);
      res.status(500).json({ 
        error: "Failed to update doctor",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }

  } else if (req.method === "DELETE") {
    // SOFT DELETE DOCTOR - Fixed column names
    try {
      const { doctorId } = req.body;

      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      // Verify doctor exists and is currently active
      const { data: existingDoctor, error: fetchError } = await supabaseAdmin
        .from("User")
        .select("id, name, email, role, active")
        .eq("id", doctorId)
        .eq("role", "doctor")
        .eq("active", true)
        .single();

      if (fetchError || !existingDoctor) {
        return res.status(404).json({ error: "Active doctor not found" });
      }

      // Get patient count for informational purposes only
      const { data: patients } = await supabaseAdmin
        .from("Patient")
        .select("id")
        .eq("doctorid", doctorId);

      const patientCount = patients?.length || 0;

      // Soft delete: Mark doctor as inactive - Fixed column names
      const { data: deactivatedDoctor, error: deactivateError } = await supabaseAdmin
        .from("User")
        .update({
          active: false,
          role: "inactive_doctor",
          deactivatedat: new Date().toISOString(),    // lowercase
          deactivatedby: adminId                      // lowercase
        })
        .eq("id", doctorId)
        .eq("role", "doctor")
        .eq("active", true)
        .select("id, name, email")
        .single();

      if (deactivateError) {
        console.error("[DEACTIVATE] Error details:", deactivateError);
        throw deactivateError;
      }

      res.status(200).json({ 
        success: true, 
        message: `Doctor ${deactivatedDoctor.name} has been deactivated successfully`,
        action: "deactivated",
        doctor: deactivatedDoctor,
        info: patientCount > 0 ? {
          patientCount: patientCount,
          note: "Patient relationships have been preserved and remain accessible"
        } : null
      });

    } catch (error) {
      console.error("[ADMIN DOCTORS DEACTIVATE] Error:", error);
      res.status(500).json({ 
        error: "Failed to deactivate doctor",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }

  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}