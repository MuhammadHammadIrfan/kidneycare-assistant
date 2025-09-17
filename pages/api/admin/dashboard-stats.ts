import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get adminId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const adminId = user?.id;
  const userRole = user?.role;

  if (!adminId || userRole !== "admin") {
    return res.status(401).json({ error: "Unauthorized: Admin access required" });
  }

  try {
    // 1. TOTAL DOCTORS (Users with role='doctor')
    const { data: doctorsData, error: doctorsError } = await supabaseAdmin
      .from("User")
      .select("id, createdat, name, email, active") // lowercase createdat
      .eq("role", "doctor")
      .eq("active", true); // Only count active doctors

    if (doctorsError) throw doctorsError;

    const totalDoctors = doctorsData?.length || 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newDoctorsThisMonth = doctorsData?.filter(d => 
      new Date(d.createdat) >= thirtyDaysAgo
    ).length || 0;

    // Also get inactive doctors count
    const { data: inactiveDoctorsData } = await supabaseAdmin
      .from("User")
      .select("id, deactivatedat") // lowercase deactivatedat
      .eq("role", "inactive_doctor");

    const totalInactiveDoctors = inactiveDoctorsData?.length || 0;

    // 2. TOTAL PATIENTS
    const { data: patientsData, error: patientsError } = await supabaseAdmin
      .from("Patient")
      .select("id, createdat, doctorid");

    if (patientsError) throw patientsError;

    const totalPatients = patientsData?.length || 0;
    const newPatientsThisMonth = patientsData?.filter(p => 
      new Date(p.createdat) >= thirtyDaysAgo
    ).length || 0;

    // 3. LAB REPORTS ACTIVITY
    const { data: labReportsData, error: reportsError } = await supabaseAdmin
      .from("LabReport")
      .select("id, reportdate, createdat, doctorid");

    if (reportsError) throw reportsError;

    const totalLabReports = labReportsData?.length || 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const reportsThisWeek = labReportsData?.filter(r => 
      new Date(r.reportdate) >= sevenDaysAgo
    ).length || 0;

    // 4. ACTIVE DOCTORS (doctors with recent activity)
    const activeDoctors = new Set(
      labReportsData
        ?.filter(r => new Date(r.reportdate) >= thirtyDaysAgo)
        .map(r => r.doctorid)
    ).size;

    // 5. MEDICATION PRESCRIPTIONS
    const { data: medicationsData, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        createdat,
        LabReport!MedicationPrescription_reportid_fkey (
          doctorid
        )
      `);

    const totalMedications = medicationsData?.length || 0;
    const medicationsThisWeek = medicationsData?.filter(m => 
      new Date(m.createdat) >= sevenDaysAgo
    ).length || 0;

    // 6. DOCTOR ACTIVITY BREAKDOWN - FIXED STRUCTURE
    const doctorActivity = doctorsData?.map(doctor => {
      const doctorPatients = patientsData?.filter(p => p.doctorid === doctor.id).length || 0;
      const doctorReports = labReportsData?.filter(r => r.doctorid === doctor.id).length || 0;
      const recentReports = labReportsData?.filter(r => 
        r.doctorid === doctor.id && new Date(r.reportdate) >= thirtyDaysAgo
      ).length || 0;

      return {
        id: doctor.id,
        name: doctor.name || 'Unknown Doctor',
        email: doctor.email || 'No email',
        patientsCount: doctorPatients,
        totalReports: doctorReports,
        recentReports: recentReports, // Ensure this is always a number
        isActive: recentReports > 0
      };
    }) || [];

    // Log the data structure for debugging
    console.log('[DASHBOARD STATS] Doctor activity sample:', doctorActivity.slice(0, 2));
    console.log('[DASHBOARD STATS] Sample recentReports values:', doctorActivity.map(d => d.recentReports).slice(0, 5));

    // Get recent doctors and patients for recent activity section
    const recentDoctors = doctorsData?.filter(d => 
      new Date(d.createdat) >= thirtyDaysAgo
    ).map(d => ({
      id: d.id,
      name: d.name || 'Unknown Doctor',
      email: d.email || 'No email',
      createdAt: d.createdat
    })) || [];

    const recentPatients = patientsData?.filter(p => 
      new Date(p.createdat) >= thirtyDaysAgo
    ).map(p => ({
      id: p.id,
      createdAt: p.createdat,
      doctorId: p.doctorid
    })) || [];

    const stats = {
      overview: {
        totalDoctors,
        totalInactiveDoctors, // Add this new field
        newDoctorsThisMonth,
        totalPatients,
        newPatientsThisMonth,
        totalLabReports,
        reportsThisWeek,
        activeDoctors,
        totalMedications,
        medicationsThisWeek
      },
      doctorActivity, // This should now have consistent structure
      recentActivity: {
        recentDoctors: recentDoctors || [],
        recentPatients: recentPatients || []
      }
    };

    console.log('[DASHBOARD STATS] Sending response with', doctorActivity.length, 'doctors');
    res.status(200).json({ success: true, stats });

  } catch (error) {
    console.error("[ADMIN DASHBOARD STATS] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch dashboard statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}