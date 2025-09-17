import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import nookies from "nookies";
import { classifyPatientSituation, TestValues } from "../../../../lib/classify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get doctorId from cookie
  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;

  if (!doctorId) {
    return res.status(401).json({ error: "Unauthorized: doctorId missing" });
  }

  const { labReportId, testResults } = req.body;

  if (!labReportId || !testResults || !Array.isArray(testResults)) {
    return res.status(400).json({ error: "Lab report ID and test results array are required" });
  }

  try {
    console.log(`[EDIT TEST RESULTS API] Updating test results for lab report: ${labReportId}`);

    // First, verify the lab report exists and get basic info
    const { data: basicLabReport, error: basicReportError } = await supabaseAdmin
      .from("LabReport")
      .select("id, patientid, situationid")
      .eq("id", labReportId)
      .single();

    if (basicReportError || !basicLabReport) {
      console.error("Basic lab report fetch error:", basicReportError);
      return res.status(404).json({ error: "Lab report not found" });
    }

    // Verify patient belongs to this doctor
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("Patient")
      .select("id, doctorid")
      .eq("id", basicLabReport.patientid)
      .eq("doctorid", doctorId)
      .single();

    if (patientError || !patient) {
      console.error("Patient verification error:", patientError);
      return res.status(403).json({ error: "Access denied: Patient does not belong to this doctor" });
    }

    // CHECK FOR EXISTING MEDICATIONS BEFORE UPDATE
    const { data: existingMedications, error: medicationsError } = await supabaseAdmin
      .from("MedicationPrescription")
      .select(`
        id,
        dosage,
        isOutdated,
        MedicationType (
          id,
          name,
          unit,
          groupname
        )
      `)
      .eq("reportid", labReportId)
      .eq("isOutdated", false); // Only active medications

    if (medicationsError) {
      console.error("Error checking medications:", medicationsError);
    }

    const hasActiveMedications = existingMedications && existingMedications.length > 0;
    console.log(`[EDIT TEST RESULTS API] Found ${existingMedications?.length || 0} active medications`);

    // Get all test results for this lab report
    const { data: allTestLinks, error: allTestLinksError } = await supabaseAdmin
      .from("LabReportTestLink")
      .select(`
        testresultid,
        TestResult (
          id,
          value,
          testtypeid,
          TestType!TestResult_testtypeid_fkey (
            id,
            code,
            name
          )
        )
      `)
      .eq("labreportid", labReportId);

    if (allTestLinksError) {
      console.error("Error fetching all test results:", allTestLinksError);
      return res.status(500).json({ error: "Failed to fetch test results for calculations" });
    }

    // Process test results correctly
    const allTests = allTestLinks?.map(link => {
      const testResult = link.TestResult;
      if (!testResult) return null;
      
      const result = Array.isArray(testResult) ? testResult[0] : testResult;
      if (!result) return null;

      const testType = Array.isArray(result.TestType) ? result.TestType[0] : result.TestType;
      if (!testType) return null;

      return {
        id: result.id,
        value: result.value,
        testtypeid: result.testtypeid,
        TestType: {
          id: testType.id,
          code: testType.code,
          name: testType.name
        }
      };
    }).filter((test): test is {
      id: string;
      value: number;
      testtypeid: number;
      TestType: {
        id: number;
        code: string;
        name: string;
      };
    } => test !== null) || [];

    console.log(`[EDIT TEST RESULTS API] Found ${allTests.length} existing test results`);

    // Store original values for change tracking
    const originalValues = new Map<string, number>();
    allTests.forEach(test => {
      if (test && test.TestType && test.TestType.code) {
        originalValues.set(test.TestType.code, test.value);
      }
    });

    // Create a map of current test values (including updates)
    const testValueMap = new Map<string, number>();
    allTests.forEach(test => {
      if (test && test.TestType && test.TestType.code) {
        testValueMap.set(test.TestType.code, test.value);
      }
    });

    // Track significant changes
    const criticalChanges: string[] = [];
    let hasSignificantChanges = false;
    
    // Update the map with new values and track changes
    testResults.forEach(update => {
      const test = allTests.find(t => t.id === update.id);
      if (test && test.TestType) {
        const newValue = parseFloat(update.value.toString());
        const oldValue = test.value;
        testValueMap.set(test.TestType.code, newValue);
        
        // Track if critical values changed significantly (>5% change)
        const changePercentage = Math.abs((newValue - oldValue) / oldValue) * 100;
        if (changePercentage > 5 && ['PTH', 'Ca', 'CaCorrected', 'Phos', 'Echo', 'LARad'].includes(test.TestType.code)) {
          criticalChanges.push(`${test.TestType.code}: ${oldValue} → ${newValue} (${changePercentage.toFixed(1)}% change)`);
          hasSignificantChanges = true;
        }
        
        console.log(`[EDIT TEST RESULTS API] Updated ${test.TestType.code}: ${oldValue} -> ${newValue}`);
      }
    });

    // Calculate Corrected Calcium if Ca or Albumin is being updated
    let correctedCalciumUpdate = null;
    const hasCalciumUpdate = testResults.some(tr => {
      const test = allTests.find(t => t.id === tr.id);
      return test?.TestType.code === 'Ca';
    });
    const hasAlbuminUpdate = testResults.some(tr => {
      const test = allTests.find(t => t.id === tr.id);
      return test?.TestType.code === 'Albumin';
    });

    if (hasCalciumUpdate || hasAlbuminUpdate) {
      const calcium = testValueMap.get('Ca');
      const albumin = testValueMap.get('Albumin');
      
      if (calcium !== undefined && albumin !== undefined) {
        const correctedCalcium = calcium + (0.8 * (4.0 - albumin));
        console.log(`[EDIT TEST RESULTS API] Calculated Corrected Calcium: ${correctedCalcium}`);
        
        // Find the CaCorrected test result
        const correctedCalciumTest = allTests.find(t => t.TestType.code === 'CaCorrected');
        if (correctedCalciumTest) {
          correctedCalciumUpdate = {
            id: correctedCalciumTest.id,
            value: correctedCalcium
          };
          testValueMap.set('CaCorrected', correctedCalcium);
          
          // Track corrected calcium change
          const oldCorrectedCa = originalValues.get('CaCorrected') || 0;
          const changePercentage = Math.abs((correctedCalcium - oldCorrectedCa) / oldCorrectedCa) * 100;
          if (changePercentage > 5) {
            criticalChanges.push(`CaCorrected: ${oldCorrectedCa.toFixed(2)} → ${correctedCalcium.toFixed(2)} (auto-calculated, ${changePercentage.toFixed(1)}% change)`);
            hasSignificantChanges = true;
          }
        }
      }
    }

    // Update all test results (including corrected calcium if calculated)
    const allUpdates = [...testResults];
    if (correctedCalciumUpdate) {
      allUpdates.push(correctedCalciumUpdate);
    }

    const updatePromises = allUpdates.map(async (testResult, index) => {
      const { id, value } = testResult;
      
      console.log(`[EDIT TEST RESULTS API] Processing test result ${index + 1}/${allUpdates.length}: ${id} = ${value}`);
      
      // Verify the test result belongs to this lab report
      const { data: existingTest, error: testCheckError } = await supabaseAdmin
        .from("LabReportTestLink")
        .select("testresultid")
        .eq("labreportid", labReportId)
        .eq("testresultid", id)
        .single();

      if (testCheckError || !existingTest) {
        console.error(`Test verification error for ${id}:`, testCheckError);
        throw new Error(`Test result ${id} does not belong to lab report ${labReportId}`);
      }

      // Update the test result with lastmodified tracking
      const updateData = {
        value: parseFloat(value.toString()),
        lastmodified: new Date().toISOString(),
        lastmodifiedby: doctorId
      };

      const { error: updateError } = await supabaseAdmin
        .from("TestResult")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        if (updateError.message.includes('column') && updateError.message.includes('lastmodified')) {
          // Fallback without lastmodified fields
          const { error: fallbackError } = await supabaseAdmin
            .from("TestResult")
            .update({ value: parseFloat(value.toString()) })
            .eq("id", id);
          
          if (fallbackError) {
            throw new Error(`Failed to update test result ${id}: ${fallbackError.message}`);
          }
        } else {
          throw new Error(`Failed to update test result ${id}: ${updateError.message}`);
        }
      }

      console.log(`[EDIT TEST RESULTS API] Successfully updated test result ${id} with value ${value}`);
      return id;
    });

    const updatedIds = await Promise.all(updatePromises);

    // **NEW: MARK MEDICATIONS AS OUTDATED IF SIGNIFICANT CHANGES**
    let outdatedMedicationsCount = 0;
    let medicationOutdatingResult = null;

    if (hasActiveMedications && hasSignificantChanges) {
      console.log(`[MEDICATION OUTDATING] Marking medications as outdated due to significant test changes`);
      
      try {
        // Mark existing medications as outdated - FIXED COLUMN NAMES
        const outdatingReason = `Test values updated: ${criticalChanges.join(', ')}`;
        
        const { error: outdateError } = await supabaseAdmin
          .from("MedicationPrescription")
          .update({
            isoutdated: true,           // lowercase
            outdatedat: new Date().toISOString(),    // lowercase  
            outdatedreason: outdatingReason,         // lowercase
            outdatedby: doctorId                     // lowercase
          })
          .eq("reportid", labReportId)     // lowercase
          .eq("isoutdated", false);        // lowercase

        if (outdateError) {
          console.error("Error marking medications as outdated:", outdateError);
          // Continue with the process even if this fails
        } else {
          outdatedMedicationsCount = existingMedications.length;
          medicationOutdatingResult = {
            count: outdatedMedicationsCount,
            reason: outdatingReason,
            medications: existingMedications.map(med => ({
              id: med.id,
              dosage: med.dosage,
              medication: med.MedicationType
            }))
          };
          console.log(`[MEDICATION OUTDATING] Successfully marked ${outdatedMedicationsCount} medications as outdated`);
        }
      } catch (error) {
        console.error("Error in medication outdating process:", error);
        // Continue with the response
      }
    }

    // Recalculate classification
    const newClassification = await recalculateAndUpdateClassificationUsingClassifyTs(
      labReportId, 
      testValueMap, 
      basicLabReport.situationid,
      basicLabReport.patientid
    );

    // Update lab report's lastmodified timestamp
    const { error: labReportUpdateError } = await supabaseAdmin
      .from("LabReport")
      .update({
        lastmodified: new Date().toISOString(),
        lastmodifiedby: doctorId
      })
      .eq("id", labReportId);

    if (labReportUpdateError && !labReportUpdateError.message.includes('lastmodified')) {
      console.error("Failed to update lab report timestamp:", labReportUpdateError);
    }

    console.log(`[EDIT TEST RESULTS API] Successfully updated ${updatedIds.length} test results and recalculated classification`);

    // Prepare comprehensive response
    const response = {
      success: true,
      message: `Updated ${updatedIds.length} test results and recalculated classification`,
      updatedTestResults: updatedIds,
      correctedCalciumUpdated: !!correctedCalciumUpdate,
      classificationChanged: newClassification.changed,
      oldClassification: newClassification.oldSituation,
      newClassification: {
        ...newClassification.newSituation,
        classifyResult: newClassification.classificationResult || {
          group: newClassification.newSituation?.groupid,
          bucket: newClassification.newSituation?.bucketid,
          situation: newClassification.newSituation?.code
        }
      },
      medicationImpact: {
        hasSignificantChanges,
        criticalChanges,
        hadActiveMedications: hasActiveMedications,
        outdatedMedicationsCount,
        outdatedMedications: medicationOutdatingResult,
        requiresReview: hasActiveMedications && hasSignificantChanges,
        warningMessage: hasActiveMedications && hasSignificantChanges 
          ? "⚠️ Test values changed significantly. Previous medication prescriptions have been marked as outdated and require review."
          : hasActiveMedications 
            ? "✅ Test values updated. Existing medications remain valid (no significant changes)."
            : "✅ Test values updated successfully."
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("[EDIT TEST RESULTS API] Error:", error);
    res.status(500).json({ 
      error: "Failed to update test results",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// UPDATED: Helper function using classify.ts
async function recalculateAndUpdateClassificationUsingClassifyTs(
  labReportId: string, 
  testValues: Map<string, number>,
  currentSituationId: number | null,
  patientId: string
) {
  try {
    console.log(`[CLASSIFICATION] Recalculating for lab report: ${labReportId}`);
    
    // Get the test values we need for classification
    const PTH = testValues.get('PTH');
    const Ca = testValues.get('Ca');
    const CaCorrected = testValues.get('CaCorrected');
    const Phos = testValues.get('Phos');
    const Echo = testValues.get('Echo'); // This is stored as 0/1 in DB
    const LARad = testValues.get('LARad');

    if (PTH === undefined || Ca === undefined || CaCorrected === undefined || 
        Phos === undefined || Echo === undefined || LARad === undefined) {
      console.log(`[CLASSIFICATION] Missing required values for classification`);
      console.log(`PTH: ${PTH}, Ca: ${Ca}, CaCorrected: ${CaCorrected}, Phos: ${Phos}, Echo: ${Echo}, LARad: ${LARad}`);
      return { changed: false, oldSituation: null, newSituation: null };
    }

    // Get previous PTH value for this patient (most recent before current lab report)
    const { data: previousLabReports, error: prevError } = await supabaseAdmin
      .from("LabReport")
      .select(`
        id,
        reportdate,
        LabReportTestLink (
          TestResult (
            value,
            TestType!TestResult_testtypeid_fkey (
              code
            )
          )
        )
      `)
      .eq("patientid", patientId)
      .neq("id", labReportId) // Exclude current report
      .order("reportdate", { ascending: false })
      .limit(1);

    let prevPTH: number | undefined = undefined;
    
    if (!prevError && previousLabReports && previousLabReports.length > 0) {
      const prevReport = previousLabReports[0];
      // Find PTH value in the previous report
      const pthResult = prevReport.LabReportTestLink?.find((link: any) => {
        const testResult = Array.isArray(link.TestResult) ? link.TestResult[0] : link.TestResult;
        const testType = Array.isArray(testResult?.TestType) ? testResult.TestType[0] : testResult?.TestType;
        return testType?.code === 'PTH';
      });
      
      if (pthResult) {
        const testResult = Array.isArray(pthResult.TestResult) ? pthResult.TestResult[0] : pthResult.TestResult;
        prevPTH = testResult?.value;
        console.log(`[CLASSIFICATION] Found previous PTH: ${prevPTH}`);
      }
    }

    // Prepare test values for classify.ts
    const classificationInput: TestValues = {
      PTH,
      prevPTH, // Will be undefined if no previous visit (classify.ts handles this)
      Ca,
      CaCorrected,
      Phos,
      Echo: Echo === 1, // Convert 0/1 to boolean for classify.ts
      LARad
    };

    console.log(`[CLASSIFICATION] Input values:`, classificationInput);

    // Use classify.ts to get the new classification
    const classificationResult = classifyPatientSituation(classificationInput);
    console.log(`[CLASSIFICATION] Classification result:`, classificationResult);

    // Convert classify.ts result to situationid
    // Rule: If group 1, situationid = situation number (T14 = 14)
    //       If group 2, situationid = 33 + situation number (T14 = 33 + 14 = 47)
    const situationNumber = parseInt(classificationResult.situation.substring(1)); // Remove 'T' prefix
    const newSituationId = classificationResult.group === 1 ? situationNumber : 33 + situationNumber;

    console.log(`[CLASSIFICATION] Mapped to situationid: ${newSituationId} (Group ${classificationResult.group}, ${classificationResult.situation})`);

    // Get old situation details if available
    let oldSituation = null;
    if (currentSituationId) {
      const { data: oldSit } = await supabaseAdmin
        .from("Situation")
        .select("id, groupid, code, description")
        .eq("id", currentSituationId)
        .single();
      oldSituation = oldSit;
    }

    // Get new situation details for verification and response
    const { data: newSituation, error: newSitError } = await supabaseAdmin
      .from("Situation")
      .select("id, groupid, bucketid, code, description")
      .eq("id", newSituationId)
      .single();

    if (newSitError || !newSituation) {
      console.error(`[CLASSIFICATION] New situation not found for ID ${newSituationId}:`, newSitError);
      return { changed: false, oldSituation, newSituation: null };
    }

    // Verify the mapping is correct
    if (newSituation.groupid !== classificationResult.group || 
        newSituation.code !== classificationResult.situation) {
      console.error(`[CLASSIFICATION] Mapping mismatch! Expected Group ${classificationResult.group}, Code ${classificationResult.situation}, but found Group ${newSituation.groupid}, Code ${newSituation.code}`);
      return { changed: false, oldSituation, newSituation };
    }

    const classificationChanged = currentSituationId !== newSituationId;

    // Update the lab report with new situation
    const { error: updateSituationError } = await supabaseAdmin
      .from("LabReport")
      .update({
        situationid: newSituationId
      })
      .eq("id", labReportId);

    if (updateSituationError) {
      console.error(`[CLASSIFICATION] Failed to update lab report situation:`, updateSituationError);
      return { changed: false, oldSituation, newSituation };
    }

    console.log(`[CLASSIFICATION] Successfully updated lab report with new situation: ${classificationResult.situation} (ID: ${newSituationId})`);

    return {
      changed: classificationChanged,
      oldSituation,
      newSituation,
      classificationResult
    };

  } catch (error) {
    console.error("[CLASSIFICATION] Error during recalculation:", error);
    return { changed: false, oldSituation: null, newSituation: null };
  }
}