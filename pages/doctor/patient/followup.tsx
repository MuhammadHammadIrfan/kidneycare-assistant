import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, User, TestTube, FileText, CheckCircle, AlertTriangle, Clock, Calendar, TrendingUp, Pill, BarChart3, Activity } from "lucide-react";
import TrendGraph from "../../../components/doctor/TrendGraph";
import DoctorSidebar from "../../../components/doctor/DoctorSidebar";
import PatientSearch from "../../../components/doctor/PatientSearch";
import TestInputTable from "../../../components/doctor/TestInputTable";
import RecommendationTable from "../../../components/doctor/RecommendationTable";
import PatientReport from "../../../components/doctor/PatientReport";
import MedicationRecommendation from "../../../components/doctor/MedicationRecommendation";
import { Button } from "../../../components/ui/button";
import { requireAuthServer } from "../../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  nationalid: string;
  contactinfo: string;
  createdat: string;
};

type RecentReport = {
  id: string;
  reportdate: string;
  notes: string;
  Situation: {
    id: number;
    groupid: number;
    code: string;
    description: string;
  };
};

type TestResult = {
  id: string;
  value: number;
  testdate: string;
  TestType: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
};

export default function FollowUpVisits({ user }: { user: any }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"search" | "tests" | "recommendations" | "complete">("search");
  
  // Patient data
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [recentReport, setRecentReport] = useState<RecentReport | null>(null);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  
  // Test form data
  const [testValues, setTestValues] = useState({
    PTH: "",
    Ca: "",
    Albumin: "",
    CaCorrected: "",
    Phos: "",
    Echo: "",
    LARad: "",
  });
  const [notes, setNotes] = useState("");
  
  // Results
  const [classificationResult, setClassificationResult] = useState<{
    group: number;
    bucket: number;
    situation: string;
    situationId: number;
    labReportId: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([]);
  const [medicationsSaved, setMedicationsSaved] = useState(false);
  const [savedMedications, setSavedMedications] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [testValidityData, setTestValidityData] = useState<Record<string, any>>({});
  const [validityLoading, setValidityLoading] = useState(false);
  const [expiredTestsCount, setExpiredTestsCount] = useState(0);

  const handlePatientFound = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep("tests");
    
    // Fetch test validity data
    fetchTestValidity(patient.id);
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTestValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTests = async () => {
    if (!selectedPatient) return;
    
    // Validate required fields
    const requiredFields = [
      { field: "PTH", value: testValues.PTH },
      { field: "Ca", value: testValues.Ca },
      { field: "Albumin", value: testValues.Albumin },
      { field: "Phos", value: testValues.Phos },
      { field: "Echo", value: testValues.Echo },
      { field: "LARad", value: testValues.LARad }
    ];
    
    const missingFields = requiredFields.filter(({ value }) => 
      value === null || value === undefined || value === ""
    ).map(({ field }) => field);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/doctor/patient/visit/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          testValues,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit test results");
      }

      setClassificationResult({
        group: data.group,
        bucket: data.bucket,
        situation: data.situation,
        situationId: data.situationId,
        labReportId: data.labReportId,
      });

      setTimeout(() => {
        setCurrentStep("recommendations");
        setSuccess("Test results submitted successfully!");
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationsSaved = (recommendations: any[]) => {
    setSavedRecommendations(recommendations);
    setSuccess("Recommendations saved successfully! You can now proceed to medications or complete the visit.");
  };

  const handleMedicationsSaved = () => {
    setMedicationsSaved(true);
    setSuccess("Medications saved successfully!");
  };

  const handleCompleteVisit = () => {
    const hasRecommendations = savedRecommendations.length > 0;
    const hasMedications = medicationsSaved;

    if (hasRecommendations && hasMedications) {
      fetchMedicationsForReport();
      return;
    }

    setShowConfirmDialog(true);
  };

  const fetchMedicationsForReport = async () => {
    if (!classificationResult?.labReportId) return;
    
    try {
      const response = await fetch(`/api/doctor/patient/medication/get-saved?labReportId=${classificationResult.labReportId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSavedMedications(data.medications || []);
      } else {
        console.error('Error fetching saved medications:', response.statusText);
        setSavedMedications([]);
      }
    } catch (error) {
      console.error('Error fetching medications for report:', error);
      setSavedMedications([]);
    }
    
    setCurrentStep("complete");
    setSuccess("Follow-up visit completed successfully!");
  };

  const handleConfirmComplete = () => {
    setShowConfirmDialog(false);
    fetchMedicationsForReport();
  };

  const handleStartNewVisit = () => {
    setCurrentStep("search");
    setSelectedPatient(null);
    setRecentReport(null);
    setRecentTests([]);
    setTestValues({
      PTH: "",
      Ca: "",
      Albumin: "",
      CaCorrected: "",
      Phos: "",
      Echo: "",
      LARad: "",
    });
    setNotes("");
    setClassificationResult(null);
    setError(null);
    setSuccess(null);
    setSavedRecommendations([]);
    setMedicationsSaved(false);
    setSavedMedications([]);
    setShowConfirmDialog(false);
  };

  const fetchTestValidity = async (patientId: string) => {
    setValidityLoading(true);
    try {
      const response = await fetch(`/api/doctor/patient/test-validity?patientId=${patientId}`);
      const data = await response.json();
      
      if (response.ok) {
        setTestValidityData(data.testValidityData);
        setExpiredTestsCount(data.summary.expiredTests);
        
        // Pre-fill test values with last valid values
        const newTestValues = { ...testValues };
        Object.entries(data.testValidityData).forEach(([testCode, validity]: [string, any]) => {
          if (validity.lastResult && validity.validityStatus.isValid) {
            const fieldMapping: Record<string, keyof typeof testValues> = {
              'PTH': 'PTH',
              'Ca': 'Ca',
              'Albumin': 'Albumin', 
              'CaCorrected': 'CaCorrected',
              'Phos': 'Phos',
              'Echo': 'Echo',
              'LARad': 'LARad'
            };
            
            const fieldName = fieldMapping[testCode];
            if (fieldName) {
              newTestValues[fieldName] = validity.lastResult.value;
            }
          }
        });
        
        setTestValues(newTestValues);
      } else {
        setError(data.error || 'Failed to fetch test validity');
      }
    } catch (err) {
      setError('Failed to fetch test validity information');
    } finally {
      setValidityLoading(false);
    }
  };

  const calculateCorrectedCalcium = (calcium: number, albumin: number) => {
    const correctedCa = calcium + 0.8 * (4 - albumin);
    return correctedCa.toFixed(2);
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "search", label: "Patient Selection", icon: User },
      { key: "tests", label: "Test Results", icon: TestTube },
      { key: "recommendations", label: "Analysis & Treatment", icon: BarChart3 },
      { key: "complete", label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
            
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isActive 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : isCompleted 
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-gray-200 border-gray-300 text-gray-500"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ml-4 ${isCompleted ? "bg-green-600" : "bg-gray-300"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TestValidityIndicator = ({ testCode, label }: { testCode: string; label: string }) => {
    const validity = testValidityData[testCode];
    
    if (!validity) {
      return (
        <div className="flex items-center space-x-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">No previous data</span>
        </div>
      );
    }

    const { validityStatus, lastResult } = validity;
    
    if (validityStatus.isExpired) {
      return (
        <div className="flex items-center space-x-2 text-amber-700">
          <AlertTriangle className="w-4 h-4" />
          <div className="text-sm">
            <div className="font-semibold">Test Needed</div>
            <div className="text-xs font-medium text-gray-800">
              Last: {lastResult ? `${lastResult.value} (${lastResult.formattedDate})` : 'Never tested'}
            </div>
            {validityStatus.daysSinceTest && (
              <div className="text-xs font-medium text-gray-800">{validityStatus.daysSinceTest} days ago</div>
            )}
          </div>
        </div>
      );
    } else if (validityStatus.isValid) {
      return (
        <div className="flex items-center space-x-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <div className="text-sm">
            <div className="font-semibold">Valid ({validityStatus.daysSinceTest} days)</div>
            <div className="text-xs font-medium text-gray-800">
              Last: {lastResult.value} ({lastResult.formattedDate})
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - Fixed layout like register.tsx */}
      <main className="flex-1 p-10 lg:ml-64 transition-all">
        <button
          className="lg:hidden mb-4 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-blue-900 mb-8"
        >
          Follow-Up Visits
        </motion.h1>

        {renderStepIndicator()}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Step 1: Search Patient */}
        {currentStep === "search" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <PatientSearch onPatientFound={handlePatientFound} />
          </motion.div>
        )}

        {/* Step 2: Test Results */}
        {currentStep === "tests" && selectedPatient && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Patient Summary */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Follow-up Visit</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Age:</p>
                  <p className="font-medium text-gray-900">{selectedPatient.age} years</p>
                </div>
                <div>
                  <p className="text-gray-600">Patient ID:</p>
                  <p className="font-medium text-gray-900 text-xs">{selectedPatient.id}</p>
                </div>
              </div>
            </div>

            {/* Test Input */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-800">
                  Lab Test Results - Follow-up Visit
                </h3>
                <div className="text-sm text-gray-600">
                  Patient: {selectedPatient.name}
                </div>
              </div>

              {/* Validity Summary */}
              {Object.keys(testValidityData).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Test Validity Summary</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-800">{Object.values(testValidityData).filter((v: any) => v.validityStatus.isValid).length} tests still valid</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-gray-800">{expiredTestsCount} tests need updating</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-800">Pre-filled with valid values</span>
                    </div>
                  </div>
                </div>
              )}

              {validityLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="font-medium text-gray-800 mt-2">Checking test validity...</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PTH */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      PTH (pg/mL)
                    </label>
                    <TestValidityIndicator testCode="PTH" label="PTH" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={testValues.PTH}
                    onChange={(e) => setTestValues({...testValues, PTH: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter PTH value"
                  />
                </div>

                {/* Calcium */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Calcium (mg/dL)
                    </label>
                    <TestValidityIndicator testCode="Ca" label="Calcium" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={testValues.Ca}
                    onChange={(e) => {
                      const newCa = parseFloat(e.target.value) || 0;
                      const albumin = parseFloat(testValues.Albumin) || 0;
                      const correctedCa = calculateCorrectedCalcium(newCa, albumin);
                      
                      setTestValues({
                        ...testValues, 
                        Ca: e.target.value,
                        CaCorrected: correctedCa
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter Calcium value"
                  />
                </div>

                {/* Albumin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Albumin (g/dL)
                    </label>
                    <TestValidityIndicator testCode="Albumin" label="Albumin" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={testValues.Albumin}
                    onChange={(e) => {
                      const newAlbumin = parseFloat(e.target.value) || 0;
                      const calcium = parseFloat(testValues.Ca) || 0;
                      const correctedCa = calculateCorrectedCalcium(calcium, newAlbumin);
                      
                      setTestValues({
                        ...testValues, 
                        Albumin: e.target.value,
                        CaCorrected: correctedCa
                      });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter Albumin value"
                  />
                </div>

                {/* Corrected Calcium */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Corrected Calcium (mg/dL)
                    </label>
                    <TestValidityIndicator testCode="CaCorrected" label="Corrected Calcium" />
                  </div>
                  <input
                    type="text"
                    value={testValues.CaCorrected}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-medium"
                    placeholder="Auto-calculated"
                  />
                  <p className="text-xs text-gray-600">
                    📊 Auto-calculated: Ca + 0.8 × (4 - Albumin)
                  </p>
                </div>
                
                {/* Phosphate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Phosphate (mg/dL)
                    </label>
                    <TestValidityIndicator testCode="Phos" label="Phosphate" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={testValues.Phos}
                    onChange={(e) => setTestValues({...testValues, Phos: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter Phosphate value"
                  />
                </div>

                {/* Echo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Echo
                    </label>
                    <TestValidityIndicator testCode="Echo" label="Echo" />
                  </div>
                  <select
                    value={testValues.Echo}
                    onChange={(e) => setTestValues({...testValues, Echo: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
                  >
                    <option value="" className="text-gray-400">Select Echo result</option>
                    <option value={0} className="text-gray-900 font-medium">Normal (0)</option>
                    <option value={1} className="text-gray-900 font-medium">Abnormal (1)</option>
                  </select>
                </div>

                {/* LA Rad */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      LA Rad
                    </label>
                    <TestValidityIndicator testCode="LARad" label="LA Rad" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={testValues.LARad}
                    onChange={(e) => setTestValues({...testValues, LARad: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter LA Rad value"
                  />
                </div>

                {/* Notes Section */}
                <div className="col-span-full space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400"
                    placeholder="Enter any additional notes about this follow-up visit..."
                  />
                </div>
              </div>

              {/* Warning for expired tests */}
              {expiredTestsCount > 0 && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900">
                        {expiredTestsCount} test{expiredTestsCount > 1 ? 's' : ''} need updating
                      </h4>
                      <p className="text-sm font-medium text-gray-800 mt-1">
                        Some tests have expired their validity period. While you can proceed with previous values 
                        for emergency cases, it's recommended to order fresh tests for accurate diagnosis.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button
                  onClick={() => setCurrentStep("search")}
                  className="px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                >
                  Back to Patient Selection
                </Button>
                <Button
                  onClick={handleSubmitTests}
                  disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-8"
                >
                  {loading ? "Processing..." : "Classify & Get Recommendations"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Analysis & Treatment (NEW ORDER: Trends → Recommendations → Medications) */}
        {currentStep === "recommendations" && classificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Patient Summary */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Follow-up Visit Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-medium text-gray-900">{selectedPatient?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Age:</p>
                  <p className="font-medium text-gray-900">{selectedPatient?.age || 'N/A'} {selectedPatient?.age ? 'years' : ''}</p>
                </div>
                <div>
                  <p className="text-gray-600">Patient ID:</p>
                  <p className="font-medium text-gray-900 text-xs">{selectedPatient?.id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Classification Result */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Current Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-600">Group</p>
                  <p className="text-2xl font-bold text-blue-900">{classificationResult.group}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-gray-600">Bucket</p>
                  <p className="text-2xl font-bold text-green-900">{classificationResult.bucket}</p>
                </div>
                <div className="text-center p-4 bg-rose-50 rounded-lg">
                  <p className="text-gray-600">Situation</p>
                  <p className="text-2xl font-bold text-rose-900">{classificationResult.situation}</p>
                </div>
              </div>
            </div>

            {/* 1. TRENDS/GRAPHS FIRST - Most Important for Decision Making */}
            {selectedPatient && (
              <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
                <TrendGraph 
                  key={`trend-followup-${selectedPatient.id}-${classificationResult?.labReportId || Date.now()}`}
                  patientId={selectedPatient.id} 
                  patientName={selectedPatient.name}
                  showTitle={true}  // This enables all the built-in buttons and functionality
                  height={400}
                />
              </div>
            )}

            {/* 2. TREATMENT RECOMMENDATIONS SECOND - Based on Trends Analysis */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-green-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-green-800 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-green-600" />
                  Treatment Recommendations
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Evidence-based recommendations based on current classification and trends
                </p>
              </div>
              <div className="p-6">
                <RecommendationTable
                  situationId={classificationResult.situationId}
                  labReportId={classificationResult.labReportId}
                  onRecommendationsSaved={handleRecommendationsSaved}
                />
              </div>
            </div>

            {/* 3. MEDICATION RECOMMENDATIONS LAST - Final Treatment Step */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-purple-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-purple-800 flex items-center">
                  <Pill className="w-6 h-6 mr-2 text-purple-600" />
                  Medication Prescriptions
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Prescribe medications based on trends analysis and treatment recommendations
                </p>
              </div>
              <div className="p-6">
                <MedicationRecommendation
                  labReportId={classificationResult.labReportId}
                  testValues={testValues}
                  classification={classificationResult}
                  onSaved={handleMedicationsSaved}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                onClick={() => setCurrentStep("tests")}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                ← Back to Test Results
              </Button>
              
              <Button
                onClick={handleCompleteVisit}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                Complete Follow-up Visit
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {currentStep === "complete" && selectedPatient && classificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Follow-up Visit Completed!
              </h2>
              <p className="text-green-700">
                The follow-up visit for {selectedPatient?.name} has been successfully recorded with new test results and recommendations.
              </p>
            </div>

            {/* Patient Report */}
            <PatientReport
              patient={{
                name: selectedPatient.name,
                age: selectedPatient.age,
                gender: selectedPatient.gender,
                nationalid: selectedPatient.nationalid,
                contactinfo: selectedPatient.contactinfo
              }}
              testValues={testValues}
              classification={classificationResult}
              recommendations={savedRecommendations}
              medications={savedMedications}
              visitType="followup"
              doctorName={user?.name || "Dr. [Doctor Name]"}
              visitDate={new Date().toLocaleDateString()}
              notes={notes}
            />

            {/* Action buttons */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleStartNewVisit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                Start New Follow-up Visit
              </Button>
              <Button
                onClick={() => window.location.href = '/doctor/dashboard'}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8"
              >
                Go to Dashboard
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl border-2 border-gray-300">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Complete Visit</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                You are about to complete the visit, but it appears you haven't saved:
              </p>
              
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                {savedRecommendations.length === 0 && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                    Treatment recommendations
                  </li>
                )}
                {!medicationsSaved && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                    Medication prescriptions
                  </li>
                )}
              </ul>
              
              <p className="text-gray-700 text-sm">
                Are you sure you want to complete the visit without saving these items?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmComplete}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Complete Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
