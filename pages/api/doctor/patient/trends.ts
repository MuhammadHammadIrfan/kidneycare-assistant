import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import nookies from 'nookies';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[TRENDS API] === Starting trends API handler ===');
  console.log('[TRENDS API] Request method:', req.method);
  console.log('[TRENDS API] Query parameters:', req.query);

  if (req.method !== 'GET') {
    console.log('[TRENDS API] Invalid method, returning 405');
    return res.status(405).end();
  }

  console.log('[TRENDS API] Getting cookies...');
  const cookies = nookies.get({ req });
  console.log('[TRENDS API] Cookies keys:', Object.keys(cookies));

  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;
  console.log('[TRENDS API] User parsed:', user ? 'exists' : 'null');

  const doctorId = user?.id;
  console.log('[TRENDS API] Doctor ID:', doctorId);

  const { patientId } = req.query;
  console.log('[TRENDS API] Patient ID from query:', patientId);

  if (!doctorId) {
    console.log('[TRENDS API] No doctor ID, returning 401');
    return res.status(401).json({ error: 'Unauthorized: doctorId missing' });
  }

  if (!patientId) {
    console.log('[TRENDS API] No patient ID, returning 400');
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    console.log('[TRENDS API] === Starting database queries ===');

    // Verify patient belongs to this doctor
    console.log('[TRENDS API] Fetching patient data...');
    console.log(
      '[TRENDS API] Query: Patient table, ID:',
      patientId,
      'Doctor ID:',
      doctorId
    );

    const { data: patientData, error: patientError } = await supabaseAdmin
      .from('Patient')
      .select('id, name, doctorid')
      .eq('id', patientId)
      .eq('doctorid', doctorId)
      .single();

    console.log('[TRENDS API] Patient query completed');
    console.log('[TRENDS API] Patient data:', patientData);
    console.log('[TRENDS API] Patient error:', patientError);

    if (patientError || !patientData) {
      console.error('[TRENDS API] Patient fetch failed:', patientError);
      return res
        .status(404)
        .json({ error: 'Patient not found', details: patientError });
    }

    console.log(
      `[TRENDS API] ✅ Patient verified: ${patientData.name} (ID: ${patientId})`
    );

    // Get all test results with validity information
    console.log('[TRENDS API] === Fetching test results ===');
    console.log('[TRENDS API] TestResult query starting...');

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

    console.log('[TRENDS API] TestResult query completed');
    console.log('[TRENDS API] Test results count:', testResults?.length || 0);
    console.log('[TRENDS API] Test error:', testError);

    if (testError) {
      console.error(
        '[TRENDS API] ❌ Test results fetch error:',
        JSON.stringify(testError, null, 2)
      );
      return res
        .status(500)
        .json({ error: 'Failed to fetch test results', details: testError });
    }

    console.log(
      `[TRENDS API] ✅ Found ${testResults?.length || 0} test results`
    );

    // Log first few test results for debugging
    if (testResults && testResults.length > 0) {
      console.log('[TRENDS API] Sample test results:');
      testResults.slice(0, 3).forEach((result, index) => {
        console.log(`[TRENDS API] Test ${index + 1}:`, {
          id: result.id,
          value: result.value,
          testdate: result.testdate,
          testtypeid: result.testtypeid,
          TestType: result.TestType,
        });
      });
    }

    // Get all lab reports
    console.log('[TRENDS API] === Fetching lab reports ===');
    console.log('[TRENDS API] LabReport query starting...');

    const { data: labReports, error: reportsError } = await supabaseAdmin
      .from('LabReport')
      .select('id, reportdate, situationid')
      .eq('patientid', patientId)
      .order('reportdate', { ascending: true });

    console.log('[TRENDS API] LabReport query completed');
    console.log('[TRENDS API] Lab reports count:', labReports?.length || 0);
    console.log('[TRENDS API] Reports error:', reportsError);

    if (reportsError) {
      console.error(
        '[TRENDS API] ❌ Lab reports fetch error:',
        JSON.stringify(reportsError, null, 2)
      );
      return res
        .status(500)
        .json({ error: 'Failed to fetch lab reports', details: reportsError });
    }

    console.log(`[TRENDS API] ✅ Found ${labReports?.length || 0} lab reports`);

    // Log lab reports for debugging
    if (labReports && labReports.length > 0) {
      console.log('[TRENDS API] Sample lab reports:');
      labReports.slice(0, 3).forEach((report, index) => {
        console.log(`[TRENDS API] Report ${index + 1}:`, {
          id: report.id,
          reportdate: report.reportdate,
          situationid: report.situationid,
        });
      });
    }

    // Get situation details separately
    console.log('[TRENDS API] === Processing situations ===');
    const situationIds =
      labReports?.map((report) => report.situationid).filter(Boolean) || [];
    console.log('[TRENDS API] Situation IDs found:', situationIds);

    let situationsMap: Record<string, any> = {};

    if (situationIds.length > 0) {
      console.log('[TRENDS API] Fetching situation details...');

      const { data: situations, error: situationsError } = await supabaseAdmin
        .from('Situation')
        .select('id, groupid, code, description')
        .in('id', situationIds);

      console.log('[TRENDS API] Situations query completed');
      console.log('[TRENDS API] Situations count:', situations?.length || 0);
      console.log('[TRENDS API] Situations error:', situationsError);

      if (situationsError) {
        console.error(
          '[TRENDS API] ⚠️ Situations fetch error (continuing):',
          situationsError
        );
      } else {
        situationsMap =
          situations?.reduce((acc, situation) => {
            acc[situation.id] = situation;
            return acc;
          }, {} as Record<string, any>) || {};
        console.log(
          '[TRENDS API] ✅ Situations mapped:',
          Object.keys(situationsMap)
        );
      }
    } else {
      console.log('[TRENDS API] No situation IDs to fetch');
    }

    // Create visit timeline
    console.log('[TRENDS API] === Creating visit timeline ===');
    const visitTimeline =
      labReports?.map((report, index) => {
        console.log(`[TRENDS API] Processing visit ${index + 1}:`, {
          reportDate: report.reportdate,
          situationId: report.situationid,
        });

        return {
          visitNumber: index + 1,
          date: new Date(report.reportdate),
          formattedDate: new Date(report.reportdate).toLocaleDateString(),
          situation: situationsMap[report.situationid] || null,
        };
      }) || [];

    console.log(
      `[TRENDS API] ✅ Visit timeline created with ${visitTimeline.length} visits`
    );
    visitTimeline.forEach((visit) => {
      console.log(
        `[TRENDS API] Visit ${visit.visitNumber}: ${
          visit.formattedDate
        } (situation: ${visit.situation?.code || 'none'})`
      );
    });

    // Handle case where no test results exist
    if (!testResults || testResults.length === 0) {
      console.log(
        `[TRENDS API] ⚠️ No test results found for patient ${patientId}`
      );
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
    console.log('[TRENDS API] === Processing test results ===');
    const testsByType: Record<string, any[]> = {};

    testResults.forEach((result: any, index) => {
      console.log(
        `[TRENDS API] Processing test result ${index + 1}/${
          testResults.length
        }:`,
        {
          id: result.id,
          TestType: result.TestType,
        }
      );

      // Handle case where TestType might be null
      if (!result.TestType) {
        console.warn(
          `[TRENDS API] ⚠️ Test result ${result.id} has no TestType - skipping`
        );
        return;
      }

      const testCode = result.TestType.code;
      console.log(`[TRENDS API] Test code: ${testCode}`);

      if (!testsByType[testCode]) {
        testsByType[testCode] = [];
        console.log(`[TRENDS API] Created new test type group: ${testCode}`);
      }

      testsByType[testCode].push({
        ...result,
        testdate: new Date(result.testdate),
      });

      console.log(
        `[TRENDS API] Added to ${testCode} group (now has ${testsByType[testCode].length} results)`
      );
    });

    console.log(
      `[TRENDS API] ✅ Test types grouped:`,
      Object.keys(testsByType)
    );
    Object.entries(testsByType).forEach(([testCode, results]) => {
      console.log(`[TRENDS API] ${testCode}: ${results.length} results`);
      // Log all test dates for this test type
      results.forEach((result, index) => {
        console.log(
          `[TRENDS API]   ${testCode} result ${
            index + 1
          }: ${result.testdate.toLocaleDateString()} (value: ${result.value})`
        );
      });
    });

    // Handle case where no visits exist but test results do
    if (visitTimeline.length === 0) {
      console.log(
        `[TRENDS API] ⚠️ No lab reports found, creating timeline from test dates`
      );

      // Create visits based on unique test dates
      const uniqueTestDates = [
        ...new Set(testResults.map((r) => r.testdate)),
      ].sort();
      console.log('[TRENDS API] Unique test dates:', uniqueTestDates);

      const dateBasedTimeline = uniqueTestDates.map((dateStr, index) => ({
        visitNumber: index + 1,
        date: new Date(dateStr),
        formattedDate: new Date(dateStr).toLocaleDateString(),
        situation: null,
      }));

      console.log(
        `[TRENDS API] Created date-based timeline with ${dateBasedTimeline.length} visits`
      );
      dateBasedTimeline.forEach((visit) => {
        console.log(
          `[TRENDS API] Date-based visit ${visit.visitNumber}: ${visit.formattedDate}`
        );
      });

      // Use this timeline instead
      visitTimeline.push(...dateBasedTimeline);
    }

    // Process trend data with validity logic
    console.log('[TRENDS API] === Processing trend data ===');
    const processedTrendData: Record<string, any> = {};

    Object.entries(testsByType).forEach(([testCode, results]) => {
      console.log(`[TRENDS API] Processing trend data for ${testCode}...`);

      const testInfo = results[0].TestType;
      const validityMonths = testInfo.validitymonths || 1;

      console.log(
        `[TRENDS API] ${testCode} - ${results.length} results, validity: ${validityMonths} months`
      );

      // Calculate test values for each visit
      const visitData = visitTimeline.map((visit) => {
        console.log(
          `[TRENDS API] Processing ${testCode} for visit ${visit.visitNumber} (${visit.formattedDate})`
        );

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

        console.log(
          `[TRENDS API] ${testCode} visit ${visit.visitNumber}: found ${validResults.length} valid results`
        );

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
            console.log(
              `[TRENDS API] ${testCode} visit ${
                visit.visitNumber
              }: Using same-day test from ${mostRecentValid.testdate.toLocaleDateString()}`
            );
          } else {
            // No same-day test, use the most recent valid test from before
            mostRecentValid = validResults.sort(
              (a, b) => b.testdate.getTime() - a.testdate.getTime()
            )[0];
            console.log(
              `[TRENDS API] ${testCode} visit ${
                visit.visitNumber
              }: Using older test from ${mostRecentValid.testdate.toLocaleDateString()}`
            );
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

        console.log(
          `[TRENDS API] ${testCode} visit ${visit.visitNumber} result:`,
          visitPoint
        );

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

      console.log(
        `[TRENDS API] ✅ ${testCode} processed - ${visitData.length} visit points, ${allTestResults.length} total results`
      );
    });

    console.log(
      `[TRENDS API] ✅ Final processed data keys:`,
      Object.keys(processedTrendData)
    );

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
