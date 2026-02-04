import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireDoctor } from "../../../../lib/authToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Get authenticated doctor from secure JWT token
  const user = requireDoctor(req, res);
  if (!user) return; // Response already sent by requireDoctor
  
  const doctorId = user.id;
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    // Verify patient belongs to this doctor
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from("Patient")
      .select("id, name, doctorid")
      .eq("id", patientId)
      .eq("doctorid", doctorId)
      .single();

    if (patientError || !patientData) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Get all test types with validity periods
    const { data: testTypes, error: testTypesError } = await supabaseAdmin
      .from("TestType")
      .select("id, code, name, unit, validitymonths")
      .order("name");

    if (testTypesError) {
      return res.status(500).json({ error: "Failed to fetch test types" });
    }

    // Get the most recent test result for each test type
    const testValidityStatus = await Promise.all(
      testTypes.map(async (testType) => {
        const { data: latestResult, error } = await supabaseAdmin
          .from("TestResult")
          .select("id, value, testdate")
          .eq("patientid", patientId)
          .eq("testtypeid", testType.id)
          .order("testdate", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error(`Error fetching latest result for ${testType.code}:`, error);
          return null;
        }

        const currentDate = new Date();
        let isValid = false;
        let daysSinceTest = null;
        let isExpired = false;
        let lastValue = null;
        let lastTestDate = null;

        if (latestResult) {
          const testDate = new Date(latestResult.testdate);
          const daysDiff = Math.floor((currentDate.getTime() - testDate.getTime()) / (1000 * 60 * 60 * 24));
          const validityDays = (testType.validitymonths || 1) * 30;
          
          daysSinceTest = daysDiff;
          isValid = daysDiff <= validityDays;
          isExpired = daysDiff > validityDays;
          lastValue = latestResult.value;
          lastTestDate = latestResult.testdate;
        } else {
          // No previous test - always expired (needs new test)
          isExpired = true;
        }

        return {
          testType: {
            id: testType.id,
            code: testType.code,
            name: testType.name,
            unit: testType.unit,
            validityMonths: testType.validitymonths || 1
          },
          lastResult: latestResult ? {
            value: lastValue,
            testDate: lastTestDate,
            formattedDate: new Date(lastTestDate).toLocaleDateString()
          } : null,
          validityStatus: {
            isValid,
            isExpired,
            daysSinceTest,
            validityDays: (testType.validitymonths || 1) * 30,
            status: isExpired ? 'expired' : (isValid ? 'valid' : 'unknown')
          }
        };
      })
    );

    // Filter out null results and organize by test code
    const validityData = testValidityStatus
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .reduce((acc, item) => {
        acc[item.testType.code] = item;
        return acc;
      }, {} as Record<string, any>);

    res.status(200).json({
      patient: patientData,
      testValidityData: validityData,
      summary: {
        totalTests: Object.keys(validityData).length,
        expiredTests: Object.values(validityData).filter((item: any) => item.validityStatus.isExpired).length,
        validTests: Object.values(validityData).filter((item: any) => item.validityStatus.isValid).length
      }
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}