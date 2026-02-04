import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireDoctor } from '../../../../lib/authToken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[TRENDS API] Starting - Patient:', req.query.patientId);

  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // Get authenticated doctor from secure JWT token
  const user = requireDoctor(req, res);
  if (!user) return; // Response already sent by requireDoctor
  
  const doctorId = user.id;
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    // Verify patient belongs to this doctor
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from('Patient')
      .select('id, name, doctorid')
      .eq('id', patientId)
      .eq('doctorid', doctorId)
      .single();

    if (patientError || !patientData) {
      console.error('[TRENDS API] Patient fetch failed:', patientError);
      return res
        .status(404)
        .json({ error: 'Patient not found', details: patientError });
    }

    // FIXED: Get lab reports EXACTLY like patient-history API
    const { data: labReports, error: reportsError } = await supabaseAdmin
      .from('LabReport')
      .select(`
        id,
        reportdate,
        notes,
        situationid,
        createdat,
        lastmodified,
        lastmodifiedby,
        Situation (
          id,
          groupid,
          bucketid,
          code,
          description
        )
      `)
      .eq('patientid', patientId)
      .order('reportdate', { ascending: true }); // Keep ascending for timeline

    if (reportsError) {
      console.error('[TRENDS API] Lab reports fetch error:', reportsError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch lab reports', details: reportsError });
    }

    console.log(`[TRENDS API] Found ${labReports?.length || 0} lab reports`);

    if (!labReports || labReports.length === 0) {
      console.log(`[TRENDS API] No lab reports found for patient ${patientId}`);
      return res.status(200).json({
        patient: patientData,
        trendData: {},
        visitContext: [],
        totalVisits: 0,
        debug: {
          testResultsCount: 0,
          labReportsCount: 0,
          processedTestTypes: [],
          timestamp: new Date().toISOString(),
          message: 'No lab reports found for this patient',
        },
      });
    }

    // Create visit timeline from lab reports (SAME as patient-history)
    const visitTimeline = labReports.map((report, index) => {
      const situation = Array.isArray(report.Situation) ? report.Situation[0] : report.Situation;
      return {
        visitNumber: index + 1,
        date: new Date(report.reportdate),
        formattedDate: new Date(report.reportdate).toLocaleDateString(),
        reportId: report.id,
        situation: situation || null,
      };
    });

    console.log('[TRENDS API] Created visit timeline:', visitTimeline);

    // FIXED: Get test results for each lab report EXACTLY like patient-history API
    const allTestResultsByReport: Record<string, any[]> = {};
    const allTestTypes: Record<string, any> = {};

    for (const report of labReports) {
      console.log(`[TRENDS API] Processing test results for lab report ${report.id}`);
      
      // FIXED: Use LabReportTestLink EXACTLY like patient-history API
      const { data: testLinks, error: testLinksError } = await supabaseAdmin
        .from("LabReportTestLink")
        .select(`
          testresultid,
          TestResult (
            id,
            value,
            testdate,
            testtypeid,
            lastmodified,
            lastmodifiedby,
            createdat,
            TestType!TestResult_testtypeid_fkey (
              id,
              code,
              name,
              unit,
              validitymonths
            )
          )
        `)
        .eq("labreportid", report.id);

      if (testLinksError) {
        console.error(`[TRENDS API] Test links fetch error for report ${report.id}:`, testLinksError);
        allTestResultsByReport[report.id] = [];
        continue;
      }

      // FIXED: Process test results EXACTLY like patient-history API
      const testResults = (testLinks || [])
        .map(link => {
          const testResult = link.TestResult;
          if (!testResult) return null;
          
          const result = Array.isArray(testResult) ? testResult[0] : testResult;
          if (!result) return null;

          const testType = Array.isArray(result.TestType) ? result.TestType[0] : result.TestType;
          if (!testType) return null;

          // Store test type info for later use
          allTestTypes[testType.code] = testType;
          
          return {
            ...result,
            testdate: new Date(result.testdate),
            TestType: testType
          };
        })
        .filter(result => result !== null);

      allTestResultsByReport[report.id] = testResults;
      console.log(`[TRENDS API] Found ${testResults.length} test results for report ${report.id}`);
    }

    // FIXED: Group test results by test type across all reports
    const testsByType: Record<string, any[]> = {};

    Object.entries(allTestResultsByReport).forEach(([reportId, testResults]) => {
      testResults.forEach((result: any) => {
        const testCode = result.TestType.code;
        
        if (!testsByType[testCode]) {
          testsByType[testCode] = [];
        }

        testsByType[testCode].push({
          ...result,
          reportId, // Keep track of which report this belongs to
        });
      });
    });

    console.log('[TRENDS API] Grouped tests by type:', Object.keys(testsByType));

    // FIXED: Process trend data using EXACT timeline from lab reports
    const processedTrendData: Record<string, any> = {};

    Object.entries(testsByType).forEach(([testCode, results]) => {
      const testInfo = allTestTypes[testCode];
      const validityMonths = testInfo.validitymonths || 1;

      console.log(`[TRENDS API] Processing ${testCode} for ${visitTimeline.length} visits`);

      // FIXED: Calculate test values for each visit using lab report timeline
      const visitData = visitTimeline.map((visit) => {
        console.log(`[TRENDS API] Processing visit ${visit.visitNumber} (${visit.formattedDate}) for ${testCode}`);
        
        // STEP 1: Check if this visit (lab report) has a test result for this test type
        const sameReportTest = results.find(result => result.reportId === visit.reportId);
        
        if (sameReportTest) {
          console.log(`[TRENDS API] Found same-report test for ${testCode} at visit ${visit.visitNumber}: ${sameReportTest.value}`);
          return {
            visitNumber: visit.visitNumber,
            visitDate: visit.formattedDate,
            value: parseFloat(sameReportTest.value),
            testDate: sameReportTest.testdate.toLocaleDateString(),
            isCurrentTest: true, // Test from same report/visit
            daysSinceTest: 0,
            testId: sameReportTest.id,
          };
        }

        // STEP 2: No test in current report, look for valid tests from previous reports within validity period
        const validResults = results.filter((result) => {
          const testDate = result.testdate;
          const visitDate = visit.date;

          // Test must be done before this visit date
          if (testDate >= visitDate) return false;

          // Test must be within validity period
          const daysDiff = (visitDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= validityMonths * 30;
        });

        console.log(`[TRENDS API] Found ${validResults.length} valid previous results for ${testCode} at visit ${visit.visitNumber}`);

        if (validResults.length > 0) {
          // Use the most recent valid test from before this visit
          const mostRecentValid = validResults.sort(
            (a, b) => b.testdate.getTime() - a.testdate.getTime()
          )[0];

          const daysSinceTest = Math.floor((visit.date.getTime() - mostRecentValid.testdate.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`[TRENDS API] Using previous test for ${testCode} at visit ${visit.visitNumber}: ${mostRecentValid.value} (${daysSinceTest} days ago)`);

          return {
            visitNumber: visit.visitNumber,
            visitDate: visit.formattedDate,
            value: parseFloat(mostRecentValid.value),
            testDate: mostRecentValid.testdate.toLocaleDateString(),
            isCurrentTest: false,
            daysSinceTest,
            testId: mostRecentValid.id,
          };
        } else {
          console.log(`[TRENDS API] No valid test found for ${testCode} at visit ${visit.visitNumber}`);
          return {
            visitNumber: visit.visitNumber,
            visitDate: visit.formattedDate,
            value: null,
            testDate: null,
            isCurrentTest: false,
            daysSinceTest: null,
            testId: null,
          };
        }
      });

      console.log(`[TRENDS API] Final visitData for ${testCode}:`, visitData);

      // Include all test results for reference (sorted by date)
      const allTestResults = results
        .sort((a, b) => a.testdate.getTime() - b.testdate.getTime())
        .map((result) => ({
          id: result.id,
          value: parseFloat(result.value),
          testDate: result.testdate.toLocaleDateString(),
          testDateObj: result.testdate,
          reportId: result.reportId,
        }));

      processedTrendData[testCode] = {
        metadata: {
          name: testInfo.name,
          unit: testInfo.unit,
          code: testCode,
          validityMonths: validityMonths,
        },
        visitData: visitData,
        allResults: allTestResults,
      };
    });

    // Add no-cache headers
    console.log('[TRENDS API] === Setting response headers ===');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    console.log('[TRENDS API] === Sending successful response ===');
    const responseData = {
      patient: patientData,
      trendData: processedTrendData,
      visitContext: visitTimeline,
      totalVisits: visitTimeline.length,
      debug: {
        testResultsCount: Object.values(allTestResultsByReport).flat().length,
        labReportsCount: labReports?.length || 0,
        processedTestTypes: Object.keys(processedTrendData),
        timestamp: new Date().toISOString(),
      },
    };

    console.log('[TRENDS API] Response summary:', {
      patientName: responseData.patient.name,
      trendDataKeys: Object.keys(responseData.trendData),
      visitCount: responseData.totalVisits,
      testResultsCount: responseData.debug.testResultsCount,
      labReportsCount: responseData.debug.labReportsCount,
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error('[TRENDS API] ❌ CRITICAL ERROR:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
