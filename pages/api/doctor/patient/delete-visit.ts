import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import nookies from "nookies";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }

  const { labReportId, patientId, deletionReason } = req.body;

  if (!labReportId || !patientId) {
    return res.status(400).json({ error: "Lab report ID and patient ID are required" });
  }

  try {
    console.log(`[DELETE VISIT API] Deleting visit for lab report: ${labReportId}`);

    // Verify the lab report belongs to a patient of this doctor
    const { data: labReport, error: reportError } = await supabaseAdmin
      .from("LabReport")
      .select("id, patientid, reportdate, notes, situationid")
      .eq("id", labReportId)
      .eq("patientid", patientId)
      .single();

    if (reportError || !labReport) {
      console.error("Lab report verification error:", reportError);
      return res.status(404).json({ error: "Lab report not found" });
    }

    // Verify the patient belongs to this doctor
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("Patient")
      .select("id, doctorid")
      .eq("id", labReport.patientid)
      .single();

    if (patientError || !patient || patient.doctorid !== doctorId) {
      console.error("Patient verification error:", patientError, patient);
      return res.status(403).json({ error: "Patient not found or access denied" });
    }

    // Get all test results linked to this lab report
    const { data: testLinks, error: testLinksError } = await supabaseAdmin
    .from("LabReportTestLink")
    .select(`
      testresultid,
      TestResult (
        id,
        patientid,
        testtypeid,
        value,
        reportfile,
        testdate,
        createdat,
        enteredbyid,
        lastmodified,
        lastmodifiedby,
        TestType!TestResult_testtypeid_fkey (
          id,
          code,
          name,
          unit,
          validitymonths,
          category
        )
      )
    `)
    .eq("labreportid", labReportId);

    if (testLinksError) {
      console.error("Test links fetch error:", testLinksError);
      return res.status(500).json({ error: "Failed to fetch test results for archiving" });
    }

    // Get all assigned recommendations (optional - may not exist)
    const { data: recommendations, error: recommendationsError } = await supabaseAdmin
      .from("AssignedRecommendation")
      .select("*")
      .eq("labreportid", labReportId);

    if (recommendationsError) {
      console.error("Recommendations fetch error:", recommendationsError);
      // Don't return error - recommendations are optional
    }

    // Get all medication prescriptions for this lab report (optional - may not exist)
    const { data: medicationPrescriptions, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        reportid,
        medicationtypeid,
        dosage,
        createdat,
        MedicationType (
          id,
          name,
          unit,
          groupname
        )
      `)
      .eq("reportid", labReportId);

    if (medicationsError) {
      console.error("Medication prescriptions fetch error:", medicationsError);
      // Don't return error - medications are optional
    }

    // Get Question and Option data for recommendations if they exist
    let questionsData = [];
    let optionsData = [];

    if (recommendations && recommendations.length > 0) {
      const questionIds = recommendations.map(r => r.questionid).filter(Boolean);
      const optionIds = recommendations.map(r => r.selectedoptionid).filter(Boolean);

      if (questionIds.length > 0) {
        const { data: questions } = await supabaseAdmin
          .from("Question")
          .select("*")
          .in("id", questionIds);
        questionsData = questions || [];
      }

      if (optionIds.length > 0) {
        const { data: options } = await supabaseAdmin
          .from("Option")
          .select("*")
          .in("id", optionIds);
        optionsData = options || [];
      }
    }

    // Combine recommendations with their question and option data
    const enrichedRecommendations = (recommendations || []).map(rec => ({
      ...rec,
      Question: questionsData.find(q => q.id === rec.questionid) || null,
      Option: optionsData.find(o => o.id === rec.selectedoptionid) || null
    }));

    // Archive the data before deletion (match ArchivedLabReport schema exactly)
    const archiveData: {
      labreportid: any;
      patientid: any;
      reportdata: any;
      testresults: any[];
      recommendations: any[] | null;
      medications?: any[]; // Add optional medications property
      deletedby: any;
      deletionreason: string;
    } = {
      labreportid: labReport.id,           // uuid NOT NULL
      patientid: labReport.patientid,      // uuid NOT NULL  
      reportdata: {                        // jsonb NOT NULL
        id: labReport.id,
        patientid: labReport.patientid,
        reportdate: labReport.reportdate,
        notes: labReport.notes,
        situationid: labReport.situationid
      },
      testresults: (testLinks || []).map(link => {
        const testResult = Array.isArray(link.TestResult) ? link.TestResult[0] : link.TestResult;
        return {
          id: testResult?.id,
          patientid: testResult?.patientid,
          testtypeid: testResult?.testtypeid,
          value: testResult?.value,
          testdate: testResult?.testdate,
          createdat: testResult?.createdat,
          enteredbyid: testResult?.enteredbyid,
          lastmodified: testResult?.lastmodified,
          lastmodifiedby: testResult?.lastmodifiedby,
          TestType: testResult?.TestType
        };
      }).filter(result => result.id !== undefined),
      recommendations: enrichedRecommendations.length > 0 ? enrichedRecommendations : null,  // jsonb (nullable)
      deletedby: doctorId,                 // uuid NOT NULL
      deletionreason: deletionReason || "No reason provided"  // text (nullable)
      // deletedat is auto-generated
    };

    // Add medications to archive if they exist
    if (medicationPrescriptions && medicationPrescriptions.length > 0) {
      archiveData.medications = medicationPrescriptions;  // Add this field to archive
    }

    const { error: archiveError } = await supabaseAdmin
      .from("ArchivedLabReport")
      .insert(archiveData);

    if (archiveError) {
      console.error("Archive error:", archiveError);
      return res.status(500).json({ error: "Failed to archive data before deletion" });
    }

    console.log(`[DELETE VISIT API] Archived lab report ${labReportId} successfully`);

    // Now delete the data in the correct order (foreign key dependencies)
    
    // 1. Delete medication prescriptions if they exist
    if (medicationPrescriptions && medicationPrescriptions.length > 0) {
      const { error: deleteMedicationsError } = await supabaseAdmin
        .from("MedicationPrescription")
        .delete()
        .eq("reportid", labReportId);

      if (deleteMedicationsError) {
        console.error("Delete medication prescriptions error:", deleteMedicationsError);
        return res.status(500).json({ error: "Failed to delete medication prescriptions" });
      }
      console.log(`[DELETE VISIT API] Deleted ${medicationPrescriptions.length} medication prescriptions`);
    }

    // 2. Delete assigned recommendations if they exist
    if (recommendations && recommendations.length > 0) {
      const { error: deleteRecommendationsError } = await supabaseAdmin
        .from("AssignedRecommendation")
        .delete()
        .eq("labreportid", labReportId);

      if (deleteRecommendationsError) {
        console.error("Delete recommendations error:", deleteRecommendationsError);
        return res.status(500).json({ error: "Failed to delete recommendations" });
      }
      console.log(`[DELETE VISIT API] Deleted ${recommendations.length} recommendations`);
    }

    // 3. Delete lab report test links
    if (testLinks && testLinks.length > 0) {
      const { error: deleteLinksError } = await supabaseAdmin
        .from("LabReportTestLink")
        .delete()
        .eq("labreportid", labReportId);

      if (deleteLinksError) {
        console.error("Delete test links error:", deleteLinksError);
        return res.status(500).json({ error: "Failed to delete test result links" });
      }
      console.log(`[DELETE VISIT API] Deleted ${testLinks.length} test result links`);

      // 4. Delete test results
      const testResultIds = testLinks.map(link => link.testresultid);
      const { error: deleteTestResultsError } = await supabaseAdmin
        .from("TestResult")
        .delete()
        .in("id", testResultIds);

      if (deleteTestResultsError) {
        console.error("Delete test results error:", deleteTestResultsError);
        return res.status(500).json({ error: "Failed to delete test results" });
      }
      console.log(`[DELETE VISIT API] Deleted ${testResultIds.length} test results`);
    }

    // 5. Finally, delete the lab report
    const { error: deleteLabReportError } = await supabaseAdmin
      .from("LabReport")
      .delete()
      .eq("id", labReportId);

    if (deleteLabReportError) {
      console.error("Delete lab report error:", deleteLabReportError);
      return res.status(500).json({ error: "Failed to delete lab report" });
    }

    console.log(`[DELETE VISIT API] Successfully deleted lab report ${labReportId} and all related data`);

    res.status(200).json({
      success: true,
      message: "Visit deleted successfully and archived for audit purposes",
      archivedData: {
        labReportId: labReportId,
        testResultsCount: testLinks?.length || 0,
        recommendationsCount: recommendations?.length || 0,
        medicationPrescriptionsCount: medicationPrescriptions?.length || 0,
        deletionDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[DELETE VISIT API] Error:", error);
    res.status(500).json({ 
      error: "Failed to delete visit",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}