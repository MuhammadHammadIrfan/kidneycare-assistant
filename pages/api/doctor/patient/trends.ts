import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import nookies from 'nookies';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[TRENDS API] Starting - Patient:', req.query.patientId);

  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const cookies = nookies.get({ req });
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  const doctorId = user?.id;
  const { patientId } = req.query;

  if (!doctorId) {
    return res.status(401).json({ error: 'Unauthorized: doctorId missing' });
  }

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

    // Get all test results with validity information
    const { data: testResults, error: testError } = await supabaseAdmin
    .from("TestResult")
    .select(`
        id,
        value,
        testdate,
        testtypeid,
        TestType!TestResult_testtypeid_fkey (
        id,
        code,
        name,
        unit,
        validitymonths
        )
    `)
    .eq("patientid", patientId)
    .order("testdate", { ascending: true });

    if (testError) {
      console.error('[TRENDS API] Test results fetch error:', testError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch test results', details: testError });
    }

    // Get all lab reports
    const { data: labReports, error: reportsError } = await supabaseAdmin
      .from('LabReport')
      .select('id, reportdate, situationid')
      .eq('patientid', patientId)
      .order('reportdate', { ascending: true });

    if (reportsError) {
      console.error('[TRENDS API] Lab reports fetch error:', reportsError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch lab reports', details: reportsError });
    }

    // Get situation details separately
    const situationIds =
      labReports?.map((report) => report.situationid).filter(Boolean) || [];

    let situationsMap: Record<string, any> = {};

    if (situationIds.length > 0) {
      const { data: situations, error: situationsError } = await supabaseAdmin
        .from('Situation')
        .select('id, groupid, code, description')
        .in('id', situationIds);

      if (situationsError) {
        console.error('[TRENDS API] Situations fetch error:', situationsError);
      } else {
        situationsMap =
          situations?.reduce((acc, situation) => {
            acc[situation.id] = situation;
            return acc;
          }, {} as Record<string, any>) || {};
      }
    }

    // Create visit timeline
    const visitTimeline =
      labReports?.map((report, index) => {
        return {
          visitNumber: index + 1,
          date: new Date(report.reportdate),
          formattedDate: new Date(report.reportdate).toLocaleDateString(),
          situation: situationsMap[report.situationid] || null,
        };
      }) || [];

    // Handle case where no test results exist
    if (!testResults || testResults.length === 0) {
      console.log(`[TRENDS API] No test results found for patient ${patientId}`);
      return res.status(200).json({
        patient: patientData,
        trendData: {},
        visitContext: visitTimeline,
        totalVisits: visitTimeline.length,
        debug: {
          testResultsCount: 0,
          labReportsCount: labReports?.length || 0,
          processedTestTypes: [],
          timestamp: new Date().toISOString(),
          message: 'No test results found for this patient',
        },
      });
    }

    // Group test results by test type
    const testsByType: Record<string, any[]> = {};

    testResults.forEach((result: any) => {
      if (!result.TestType) {
        return;
      }

      const testCode = result.TestType.code;

      if (!testsByType[testCode]) {
        testsByType[testCode] = [];
      }

      testsByType[testCode].push({
        ...result,
        testdate: new Date(result.testdate),
      });
    });

    // Handle case where no visits exist but test results do
    if (visitTimeline.length === 0) {
      // Create visits based on unique test dates
      const uniqueTestDates = [
        ...new Set(testResults.map((r) => r.testdate)),
      ].sort();

      const dateBasedTimeline = uniqueTestDates.map((dateStr, index) => ({
        visitNumber: index + 1,
        date: new Date(dateStr),
        formattedDate: new Date(dateStr).toLocaleDateString(),
        situation: null,
      }));

      visitTimeline.push(...dateBasedTimeline);
    }

    // Process trend data with validity logic
    const processedTrendData: Record<string, any> = {};

    Object.entries(testsByType).forEach(([testCode, results]) => {
      const testInfo = results[0].TestType;
      const validityMonths = testInfo.validitymonths || 1;

      // Calculate test values for each visit
      const visitData = visitTimeline.map((visit) => {
        // Find ALL test results before or on this visit date that are within validity
        const validResults = results.filter((result) => {
          const testDate = result.testdate;
          const visitDate = visit.date;

          // Test must be done before or on visit date
          if (testDate > visitDate) return false;

          // Test must be within validity period
          const daysDiff =
            (visitDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= validityMonths * 30;
        });

        // Priority logic: prefer same-day tests over older tests
        let mostRecentValid = null;

        if (validResults.length > 0) {
          // First, check for tests done on the EXACT same day as the visit
          const sameDayTests = validResults.filter(
            (result) =>
              result.testdate.toDateString() === visit.date.toDateString()
          );

          if (sameDayTests.length > 0) {
            // Use the most recent test from the same day (in case multiple tests on same day)
            mostRecentValid = sameDayTests.sort(
              (a, b) => b.testdate.getTime() - a.testdate.getTime()
            )[0];
          } else {
            // No same-day test, use the most recent valid test from before
            mostRecentValid = validResults.sort(
              (a, b) => b.testdate.getTime() - a.testdate.getTime()
            )[0];
          }
        }

        const visitPoint = {
          visitNumber: visit.visitNumber,
          visitDate: visit.formattedDate,
          value: mostRecentValid ? parseFloat(mostRecentValid.value) : null,
          testDate: mostRecentValid
            ? mostRecentValid.testdate.toLocaleDateString()
            : null,
          isCurrentTest: mostRecentValid
            ? mostRecentValid.testdate.toDateString() ===
              visit.date.toDateString()
            : false,
          daysSinceTest: mostRecentValid
            ? Math.floor(
                (visit.date.getTime() - mostRecentValid.testdate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
          testId: mostRecentValid ? mostRecentValid.id : null,
        };

        return visitPoint;
      });

      // Also include all actual test results for reference
      const allTestResults = results.map((result) => ({
        id: result.id,
        value: parseFloat(result.value),
        testDate: result.testdate.toLocaleDateString(),
        testDateObj: result.testdate,
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

    // Add no-cache headers to prevent 304 responses
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
        testResultsCount: testResults?.length || 0,
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
    console.error(
      '[TRENDS API] Error name:',
      error instanceof Error ? error.name : 'Unknown'
    );
    console.error(
      '[TRENDS API] Error message:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    console.error(
      '[TRENDS API] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );

    if (error instanceof Error && error.message) {
      console.error('[TRENDS API] Error details:', error.message);
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
