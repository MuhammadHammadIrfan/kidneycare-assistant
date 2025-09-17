// pages/api/doctor/dashboard/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }

  try {
    // 1. PATIENT STATISTICS
    const { data: totalPatientsData, error: patientsError } = await supabaseAdmin
      .from("Patient")
      .select("id, createdat")
      .eq("doctorid", doctorId);

    if (patientsError) throw patientsError;

    const totalPatients = totalPatientsData?.length || 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newPatientsThisMonth = totalPatientsData?.filter(p => 
      new Date(p.createdat) >= thirtyDaysAgo
    ).length || 0;

    // 2. LAB REPORTS STATISTICS
    const { data: labReportsData, error: reportsError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id, 
        reportdate, 
        createdat,
        situationid,
        patientid,
        Situation (
          groupid,
          bucketid,
          code
        )
      `)
      .eq("doctorid", doctorId)
      .order("reportdate", { ascending: false });

    if (reportsError) throw reportsError;

    const totalReports = labReportsData?.length || 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const reportsThisWeek = labReportsData?.filter(r => 
      new Date(r.reportdate) >= sevenDaysAgo
    ).length || 0;

    // 3. ACTIVE PATIENTS (had visits in last 30 days)
    const activePatients = new Set(
      labReportsData
        ?.filter(r => new Date(r.reportdate) >= thirtyDaysAgo)
        .map(r => r.patientid)
    ).size;

    // 4. CLASSIFICATION DISTRIBUTION
    const classificationDistribution = {
      group1: 0,
      group2: 0,
      bucket1: 0,
      bucket2: 0,
      bucket3: 0
    };

    labReportsData?.forEach(report => {
      if (report.Situation) {
        const situation = Array.isArray(report.Situation) ? report.Situation[0] : report.Situation;
        if (situation) {
          if (situation.groupid === 1) classificationDistribution.group1++;
          if (situation.groupid === 2) classificationDistribution.group2++;
          if (situation.bucketid === 1) classificationDistribution.bucket1++;
          if (situation.bucketid === 2) classificationDistribution.bucket2++;
          if (situation.bucketid === 3) classificationDistribution.bucket3++;
        }
      }
    });

    // 5. MEDICATION PRESCRIPTIONS
    const { data: medicationsData, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        createdat,
        LabReport!MedicationPrescription_reportid_fkey (
          doctorid
        )
      `)
      .eq("LabReport.doctorid", doctorId);

    const totalMedications = medicationsData?.length || 0;
    const medicationsThisWeek = medicationsData?.filter(m => 
      new Date(m.createdat) >= sevenDaysAgo
    ).length || 0;

    // 6. TREATMENT RECOMMENDATIONS
    const { data: recommendationsData, error: recommendationsError } = await supabaseAdmin
      .from("TreatmentRecommendation")
      .select(`
        id,
        createdat,
        LabReport!TreatmentRecommendation_reportid_fkey (
          doctorid
        )
      `)
      .eq("LabReport.doctorid", doctorId);

    const totalRecommendations = recommendationsData?.length || 0;
    const recommendationsThisWeek = recommendationsData?.filter(r => 
      new Date(r.createdat) >= sevenDaysAgo
    ).length || 0;

    // 7. PATIENTS NEEDING FOLLOW-UP (no visit in last 60 days but had previous visits)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const patientsWithRecentVisits = new Set(
      labReportsData
        ?.filter(r => new Date(r.reportdate) >= sixtyDaysAgo)
        .map(r => r.patientid)
    );

    const allPatientsWithVisits = new Set(
      labReportsData?.map(r => r.patientid)
    );

    const patientsNeedingFollowup = allPatientsWithVisits.size - patientsWithRecentVisits.size;

    const stats = {
      patients: {
        total: totalPatients,
        newThisMonth: newPatientsThisMonth,
        active: activePatients,
        needingFollowup: patientsNeedingFollowup
      },
      labReports: {
        total: totalReports,
        thisWeek: reportsThisWeek
      },
      medications: {
        total: totalMedications,
        thisWeek: medicationsThisWeek
      },
      recommendations: {
        total: totalRecommendations,
        thisWeek: recommendationsThisWeek
      },
      classification: classificationDistribution
    };

    res.status(200).json({ success: true, stats });

  } catch (error) {
    console.error("[DASHBOARD STATS API] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch dashboard statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}