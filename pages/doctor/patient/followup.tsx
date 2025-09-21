import { useState, useEffect } from "react";
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
  // FIXED: Add proper sidebar state management like register.tsx
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<"search" | "tests" | "recommendations" | "complete">("search");
  
  // Initialize sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Desktop: sidebar open by default (unless explicitly closed)
        if (isSidebarOpen === undefined) {
          setSidebarOpen(true);
        }
      } else {
        // Mobile: sidebar closed by default
        if (isSidebarOpen === undefined) {
          setSidebarOpen(false);
        }
      }
    };

    // Initial check
    handleResize();
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isSidebarOpen]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar function (for mobile)
  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
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
  const [anythingSaving, setAnythingSaving] = useState(false);

  const handlePatientFound = (patient: Patient, recentReport: RecentReport | null, recentTests: TestResult[]) => {
    setSelectedPatient(patient);
    setRecentReport(recentReport);
    setRecentTests(recentTests);
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

  // FIXED: Mobile-responsive step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: "search", label: "Patient Selection", icon: User },
      { key: "tests", label: "Test Results", icon: TestTube },
      { key: "recommendations", label: "Analysis & Treatment", icon: BarChart3 },
      { key: "complete", label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="mb-4 lg:mb-8">
        {/* Mobile: Horizontal scroll, Desktop: Centered */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center justify-center space-x-2 lg:space-x-4 min-w-max px-4 lg:px-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center flex-shrink-0">
                  <div
                    className={`flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 transition-colors
                      ${isActive 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : isCompleted 
                          ? "bg-green-600 border-green-600 text-white"
                          : "bg-gray-200 border-gray-300 text-gray-500"
                      }`}
                  >
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <span className={`ml-1 lg:ml-2 text-xs lg:text-sm font-medium whitespace-nowrap ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-4 lg:w-8 h-0.5 ml-2 lg:ml-4 ${isCompleted ? "bg-green-600" : "bg-gray-300"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // FIXED: Mobile-responsive validity indicator
  const TestValidityIndicator = ({ testCode, label }: { testCode: string; label: string }) => {
    const validity = testValidityData[testCode];
    
    if (!validity) {
      return (
        <div className="flex items-center space-x-1 lg:space-x-2 text-gray-700">
          <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
          <span className="text-xs lg:text-sm font-medium">No previous data</span>
        </div>
      );
    }

    const { validityStatus, lastResult } = validity;
    
    if (validityStatus.isExpired) {
      return (
        <div className="flex items-center space-x-1 lg:space-x-2 text-amber-700">
          <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4" />
          <div className="text-xs lg:text-sm">
            <div className="font-semibold">Test Needed</div>
            <div className="text-xs font-medium text-gray-800 hidden lg:block">
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
        <div className="flex items-center space-x-1 lg:space-x-2 text-green-700">
          <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4" />
          <div className="text-xs lg:text-sm">
            <div className="font-semibold">Valid ({validityStatus.daysSinceTest} days)</div>
            <div className="text-xs font-medium text-gray-800 hidden lg:block">
              Last: {lastResult.value} ({lastResult.formattedDate})
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar - FIXED: Add sidebar like register.tsx */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content - FIXED: Dynamic margin based on sidebar state */}
      <div className={`transition-all duration-300 min-h-screen ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } overflow-x-hidden`}>
        <div className="p-3 lg:p-6 xl:p-10">
          {/* Mobile/Desktop Menu Button - FIXED: Add menu button like register.tsx */}
          <div className="mb-4">
            <button
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
              onClick={toggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900 mb-4 lg:mb-8"
          >
            Follow-Up Visits
          </motion.h1>

          {renderStepIndicator()}

          {error && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm lg:text-base">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm lg:text-base">{success}</p>
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

          {/* Step 2: Test Results - MOBILE RESPONSIVE */}
          {currentStep === "tests" && selectedPatient && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Patient Summary */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Follow-up Visit</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name:</p>
                    <p className="font-medium text-gray-900 truncate">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age:</p>
                    <p className="font-medium text-gray-900">{selectedPatient.age} years</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Patient ID:</p>
                    <p className="font-medium text-gray-900 text-xs break-all">{selectedPatient.id}</p>
                  </div>
                </div>
              </div>

              {/* Test Input - MOBILE RESPONSIVE */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 lg:mb-6">
                  <h3 className="text-base lg:text-xl font-semibold text-blue-800">
                    Lab Test Results - Follow-up Visit
                  </h3>
                  <div className="text-xs lg:text-sm text-gray-600">
                    Patient: <span className="font-medium">{selectedPatient.name}</span>
                  </div>
                </div>

                {/* Validity Summary - MOBILE RESPONSIVE */}
                {Object.keys(testValidityData).length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 lg:p-4 mb-4 lg:mb-6">
                    <div className="flex items-center space-x-2 mb-2 lg:mb-3">
                      <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900 text-sm lg:text-base">Test Validity Summary</h4>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-3 text-xs lg:text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                        <span className="font-medium text-gray-800">{Object.values(testValidityData).filter((v: any) => v.validityStatus.isValid).length} tests still valid</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4 text-amber-600" />
                        <span className="font-medium text-gray-800">{expiredTestsCount} tests need updating</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600" />
                        <span className="font-medium text-gray-800">Pre-filled with valid values</span>
                      </div>
                    </div>
                  </div>
                )}

                {validityLoading && (
                  <div className="text-center py-4 lg:py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="font-medium text-gray-800 mt-2 text-sm lg:text-base">Checking test validity...</p>
                  </div>
                )}

                {/* Test Inputs Grid - MOBILE RESPONSIVE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* PTH */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        PTH (pg/mL) <span className="text-red-500">*</span>
                      </label>
                      <TestValidityIndicator testCode="PTH" label="PTH" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={testValues.PTH}
                      onChange={(e) => setTestValues({...testValues, PTH: e.target.value})}
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter PTH value"
                    />
                  </div>

                  {/* Calcium */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        Calcium (mg/dL) <span className="text-red-500">*</span>
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
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter Calcium value"
                    />
                  </div>

                  {/* Albumin */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        Albumin (g/dL) <span className="text-red-500">*</span>
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
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter Albumin value"
                    />
                  </div>

                  {/* Corrected Calcium */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        Corrected Calcium (mg/dL)
                      </label>
                      <TestValidityIndicator testCode="CaCorrected" label="Corrected Calcium" />
                    </div>
                    <input
                      type="text"
                      value={testValues.CaCorrected}
                      readOnly
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-medium text-sm lg:text-base"
                      placeholder="Auto-calculated"
                    />
                    <p className="text-xs text-gray-600">
                      📊 Auto-calculated: Ca + 0.8 × (4 - Albumin)
                    </p>
                  </div>
                  
                  {/* Phosphate */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        Phosphate (mg/dL) <span className="text-red-500">*</span>
                      </label>
                      <TestValidityIndicator testCode="Phos" label="Phosphate" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={testValues.Phos}
                      onChange={(e) => setTestValues({...testValues, Phos: e.target.value})}
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter Phosphate value"
                    />
                  </div>

                  {/* Echo */}
                  <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        Echo <span className="text-red-500">*</span>
                      </label>
                      <TestValidityIndicator testCode="Echo" label="Echo" />
                    </div>
                    <select
                      value={testValues.Echo}
                      onChange={(e) => setTestValues({...testValues, Echo: e.target.value})}
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium text-sm lg:text-base"
                    >
                      <option value="" className="text-gray-400">Select Echo result</option>
                      <option value={0} className="text-gray-900 font-medium">Normal (0)</option>
                      <option value={1} className="text-gray-900 font-medium">Abnormal (1)</option>
                    </select>
                  </div>

                  {/* LA Rad */}
                  <div className="space-y-2 lg:col-span-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                      <label className="block text-sm lg:text-base font-medium text-gray-700">
                        LA Rad <span className="text-red-500">*</span>
                      </label>
                      <TestValidityIndicator testCode="LARad" label="LA Rad" />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={testValues.LARad}
                      onChange={(e) => setTestValues({...testValues, LARad: e.target.value})}
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter LA Rad value"
                    />
                  </div>

                  {/* Notes Section */}
                  <div className="lg:col-span-2 space-y-2">
                    <label className="block text-sm lg:text-base font-medium text-gray-700">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2 lg:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-400 text-sm lg:text-base"
                      placeholder="Enter any additional notes about this follow-up visit..."
                    />
                  </div>
                </div>

                {/* Warning for expired tests - MOBILE RESPONSIVE */}
                {expiredTestsCount > 0 && (
                  <div className="mt-4 lg:mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 lg:p-4">
                    <div className="flex items-start space-x-2 lg:space-x-3">
                      <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-900 text-sm lg:text-base">
                          {expiredTestsCount} test{expiredTestsCount > 1 ? 's' : ''} need updating
                        </h4>
                        <p className="text-xs lg:text-sm font-medium text-gray-800 mt-1">
                          Some tests have expired their validity period. While you can proceed with previous values 
                          for emergency cases, it's recommended to order fresh tests for accurate diagnosis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons - MOBILE RESPONSIVE */}
                <div className="flex flex-col lg:flex-row justify-between gap-3 lg:gap-4 mt-6 lg:mt-8">
                  <Button
                    onClick={() => setCurrentStep("search")}
                    className="w-full lg:w-auto px-4 lg:px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 text-sm lg:text-base"
                  >
                    Back to Patient Selection
                  </Button>
                  <Button
                    onClick={handleSubmitTests}
                    disabled={loading || anythingSaving}
                    className="w-full lg:w-auto bg-rose-600 hover:bg-rose-700 text-white px-6 lg:px-8 disabled:bg-gray-400 text-sm lg:text-base"
                  >
                    {loading ? "Processing..." : anythingSaving ? "Save in progress..." : "Classify & Get Recommendations"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Analysis & Treatment - MOBILE RESPONSIVE */}
          {currentStep === "recommendations" && classificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Patient Summary */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Follow-up Visit Results</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name:</p>
                    <p className="font-medium text-gray-900 truncate">{selectedPatient?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age:</p>
                    <p className="font-medium text-gray-900">{selectedPatient?.age || 'N/A'} {selectedPatient?.age ? 'years' : ''}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Patient ID:</p>
                    <p className="font-medium text-gray-900 text-xs break-all">{selectedPatient?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Classification Result - MOBILE RESPONSIVE */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Current Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                  <div className="text-center p-3 lg:p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-600 text-xs lg:text-sm">Group</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{classificationResult.group}</p>
                  </div>
                  <div className="text-center p-3 lg:p-4 bg-green-50 rounded-lg">
                    <p className="text-gray-600 text-xs lg:text-sm">Bucket</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-900">{classificationResult.bucket}</p>
                  </div>
                  <div className="text-center p-3 lg:p-4 bg-rose-50 rounded-lg sm:col-span-3 lg:col-span-1">
                    <p className="text-gray-600 text-xs lg:text-sm">Situation</p>
                    <p className="text-lg lg:text-2xl font-bold text-rose-900 break-words">{classificationResult.situation}</p>
                  </div>
                </div>
              </div>

              {/* 1. TRENDS/GRAPHS FIRST - MOBILE RESPONSIVE */}
              {selectedPatient && (
                <div className="bg-white/90 rounded-xl shadow-lg border border-blue-100 overflow-hidden">
                  <TrendGraph 
                    key={`trend-followup-${selectedPatient.id}-${classificationResult?.labReportId || Date.now()}`}
                    patientId={selectedPatient.id} 
                    patientName={selectedPatient.name}
                    showTitle={true}
                    height={300}
                  />
                </div>
              )}

              {/* 2. TREATMENT RECOMMENDATIONS - MOBILE RESPONSIVE */}
              <div className="bg-white/90 rounded-xl shadow-lg border border-green-100 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                  <h2 className="text-base lg:text-xl font-semibold text-green-800 flex items-center">
                    <FileText className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-green-600" />
                    Treatment Recommendations
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-1">
                    Evidence-based recommendations based on current classification and trends
                  </p>
                </div>
                <div className="p-4 lg:p-6">
                  <RecommendationTable
                    situationId={classificationResult.situationId}
                    labReportId={classificationResult.labReportId}
                    onRecommendationsSaved={handleRecommendationsSaved}
                    disabled={anythingSaving}
                    onSavingStart={() => setAnythingSaving(true)}
                    onSavingEnd={() => setAnythingSaving(false)}
                  />
                </div>
              </div>

              {/* 3. MEDICATION RECOMMENDATIONS - MOBILE RESPONSIVE */}
              <div className="bg-white/90 rounded-xl shadow-lg border border-purple-100 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-gray-200">
                  <h2 className="text-base lg:text-xl font-semibold text-purple-800 flex items-center">
                    <Pill className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-purple-600" />
                    Medication Prescriptions
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-1">
                    Prescribe medications based on trends analysis and treatment recommendations
                  </p>
                </div>
                <div className="p-4 lg:p-6">
                  <MedicationRecommendation
                    labReportId={classificationResult.labReportId}
                    testValues={testValues}
                    classification={classificationResult}
                    onSaved={handleMedicationsSaved}
                    disabled={anythingSaving}
                    onSavingStart={() => setAnythingSaving(true)}
                    onSavingEnd={() => setAnythingSaving(false)}
                  />
                </div>
              </div>

              {/* Navigation Buttons - MOBILE RESPONSIVE */}
              <div className="flex flex-col lg:flex-row justify-between items-center gap-3 lg:gap-4 pt-4 lg:pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setCurrentStep("tests")}
                  disabled={anythingSaving}
                  className="w-full lg:w-auto bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400 text-sm lg:text-base"
                >
                  {anythingSaving ? "Save in progress..." : "← Back to Test Results"}
                </Button>
                
                <Button
                  onClick={handleCompleteVisit}
                  disabled={anythingSaving}
                  className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-6 lg:px-8 disabled:bg-gray-400 text-sm lg:text-base"
                >
                  {anythingSaving ? "Save in progress..." : "Complete Follow-up Visit"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete - MOBILE RESPONSIVE */}
          {currentStep === "complete" && selectedPatient && classificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-4 lg:space-y-6"
            >
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 lg:p-8">
                <CheckCircle className="w-12 h-12 lg:w-16 lg:h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl lg:text-2xl font-bold text-green-800 mb-2">
                  Follow-up Visit Completed!
                </h2>
                <p className="text-green-700 text-sm lg:text-base">
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

              {/* Action buttons - MOBILE RESPONSIVE */}
              <div className="flex flex-col lg:flex-row justify-center gap-3 lg:gap-4 pt-4">
                <Button
                  onClick={handleStartNewVisit}
                  className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 lg:px-8 text-sm lg:text-base"
                >
                  Start New Follow-up Visit
                </Button>
                <Button
                  onClick={() => window.location.href = '/doctor/dashboard'}
                  className="w-full lg:w-auto bg-gray-600 hover:bg-gray-700 text-white px-6 lg:px-8 text-sm lg:text-base"
                >
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog - MOBILE RESPONSIVE */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-300">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 mr-2" />
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Confirm Complete Visit</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 text-sm lg:text-base mb-3">
                You are about to complete the visit, but it appears you haven't saved:
              </p>
              
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                {savedRecommendations.length === 0 && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Treatment recommendations</span>
                  </li>
                )}
                {!medicationsSaved && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Medication prescriptions</span>
                  </li>
                )}
              </ul>
              
              <p className="text-gray-700 text-sm">
                Are you sure you want to complete the visit without saving these items?
              </p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm lg:text-base"
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmComplete}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm lg:text-base"
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
