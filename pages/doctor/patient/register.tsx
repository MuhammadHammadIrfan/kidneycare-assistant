import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, User, TestTube, FileText, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import DoctorSidebar from "../../../components/doctor/DoctorSidebar";
import PatientForm from "../../../components/doctor/PatientForm";
import TestInputTable from "../../../components/doctor/TestInputTable";
import RecommendationTable from "../../../components/doctor/RecommendationTable";
import MedicationRecommendation from "../../../components/doctor/MedicationRecommendation";
import PatientReport from "../../../components/doctor/PatientReport";
import { Button } from "../../../components/ui/button";
import { requireAuthServer } from "../../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

export default function RegisterPatient({ user }: { user: any }) {
  // FIXED: Proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<"patient" | "tests" | "recommendations" | "complete">("patient");
  
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
  
  // Patient form data
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    nationalId: "",
    contactInfo: "",
  });
  
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
  
  // Results
  const [classificationResult, setClassificationResult] = useState<{
    group: number;
    bucket: number;
    situation: string;
    situationId: number;
    labReportId: string;
    patientId: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([]);
  const [medicationsSaved, setMedicationsSaved] = useState(false);
  const [savedMedications, setSavedMedications] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [anythingSaving, setAnythingSaving] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTestValues({ ...testValues, [e.target.name]: e.target.value });
  };

  const handlePatientSubmit = () => {
    // Validate patient form
    const requiredFields = ["name", "age", "gender", "nationalId"];
    const missingFields = requiredFields.filter(field => !form[field as keyof typeof form]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    setError(null);
    setCurrentStep("tests");
  };

  const handleTestSubmit = async () => {
    // Validate test form
    const requiredFields = ["PTH", "Ca", "Albumin", "Phos", "Echo", "LARad"];
    const missingFields = requiredFields.filter(field => !testValues[field as keyof typeof testValues]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/doctor/patient/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, testValues }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setClassificationResult({
        group: data.group,
        bucket: data.bucket,
        situation: data.situation,
        situationId: data.situationId,
        labReportId: data.labReportId,
        patientId: data.patientId,
      });

      setCurrentStep("recommendations");
      setSuccess("Patient registered successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationsSaved = (recommendations: any[]) => {
    setSavedRecommendations(recommendations);
    setSuccess("Recommendations saved successfully! You can now proceed to medications or complete the registration.");
  };

  const handleMedicationsSaved = () => {
    setMedicationsSaved(true);
    setSuccess("Medications saved successfully!");
  };

  const handleCompleteRegistration = () => {
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
    setSuccess("Patient registration completed successfully!");
  };

  const handleConfirmComplete = () => {
    setShowConfirmDialog(false);
    fetchMedicationsForReport();
  };

  const handleStartNewRegistration = () => {
    setCurrentStep("patient");
    setForm({
      name: "",
      age: "",
      gender: "",
      nationalId: "",
      contactInfo: "",
    });
    setTestValues({
      PTH: "",
      Ca: "",
      Albumin: "",
      CaCorrected: "",
      Phos: "",
      Echo: "",
      LARad: "",
    });
    setClassificationResult(null);
    setError(null);
    setSuccess(null);
    setSavedRecommendations([]);
    setMedicationsSaved(false);
    setSavedMedications([]);
    setShowConfirmDialog(false);
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "patient", label: "Patient Info", icon: User },
      { key: "tests", label: "Test Results", icon: TestTube },
      { key: "recommendations", label: "Recommendations", icon: FileText },
      { key: "complete", label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="mb-4 lg:mb-8">
        {/* Mobile: Horizontal scroll, Desktop: Centered */}
        <div className="block sm:hidden">
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center space-x-3 min-w-max px-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.key;
                const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
                
                return (
                  <div key={step.key} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors mb-1
                          ${isActive 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : isCompleted 
                              ? "bg-green-600 border-green-600 text-white"
                              : "bg-gray-200 border-gray-300 text-gray-500"
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-medium text-center whitespace-nowrap ${
                        isActive ? "text-blue-600" : "text-gray-500"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div className={`w-6 h-0.5 mx-2 mt-[-8px] ${
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tablet and Desktop: Horizontal centered layout */}
        <div className="hidden sm:flex justify-center">
          <div className="flex items-center space-x-4 lg:space-x-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 transition-colors
                      ${isActive 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : isCompleted 
                          ? "bg-green-600 border-green-600 text-white"
                          : "bg-gray-200 border-gray-300 text-gray-500"
                      }`}
                  >
                    <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <span className={`ml-2 lg:ml-3 text-sm lg:text-base font-medium ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}>
                    {step.label}
                  </span>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-8 lg:w-12 h-0.5 ml-4 lg:ml-6 ${
                      isCompleted ? "bg-green-600" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content - FIXED: Dynamic margin based on sidebar state */}
      <div className={`transition-all duration-300 min-h-screen ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        <div className="p-3 lg:p-6 xl:p-10">
          {/* Mobile/Desktop Menu Button */}
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
            Register New Patient
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

          {/* Step 1: Patient Information */}
          {currentStep === "patient" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-lg lg:text-xl font-bold text-blue-900 mb-4 lg:mb-6">Patient Information</h3>
                <PatientForm form={form} onChange={handleFormChange} />
                
                <div className="flex justify-end mt-6 lg:mt-8">
                  <Button
                    onClick={handlePatientSubmit}
                    className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 lg:px-8 py-2 lg:py-3"
                  >
                    Continue to Test Results
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Test Results */}
          {currentStep === "tests" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Patient Info Summary */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Patient Summary</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name:</p>
                    <p className="font-medium text-gray-900 truncate">{form.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age:</p>
                    <p className="font-medium text-gray-900">{form.age} years</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Hospital ID:</p>
                    {/* Natioal Id is used allover in backed and db, just for frontend changed to Hospital Id */}
                    <p className="font-medium text-gray-900 break-all">{form.nationalId}</p>
                  </div>
                </div>
              </div>

              {/* Test Input */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-lg lg:text-xl font-bold text-blue-900 mb-4 lg:mb-6">Initial Test Results</h3>
                <TestInputTable testValues={testValues} onChange={handleTestChange} />

                <div className="flex flex-col lg:flex-row justify-between gap-3 lg:gap-4 mt-6 lg:mt-8">
                  <Button
                    onClick={() => setCurrentStep("patient")}
                    className="w-full lg:w-auto px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                  >
                    Back to Patient Info
                  </Button>
                  <Button
                    onClick={handleTestSubmit}
                    disabled={loading}
                    className="w-full lg:w-auto bg-rose-600 hover:bg-rose-700 text-white px-6 lg:px-8"
                  >
                    {loading ? "Processing..." : "Register & Generate Recommendations"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Recommendations */}
          {currentStep === "recommendations" && classificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-4 lg:space-y-6"
            >
              {/* Patient Summary */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">New Patient Registered</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name:</p>
                    <p className="font-medium text-gray-900 truncate">{form.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age:</p>
                    <p className="font-medium text-gray-900">{form.age} years</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Patient ID:</p>
                    <p className="font-medium text-gray-900 text-xs break-all">{classificationResult.patientId}</p>
                  </div>
                </div>
              </div>

              {/* Classification Result */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Classification Result</h3>
                <div className="grid grid-cols-3 gap-3 lg:gap-4">
                  <div className="text-center p-3 lg:p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-600 text-xs lg:text-sm">Group</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{classificationResult.group}</p>
                  </div>
                  <div className="text-center p-3 lg:p-4 bg-green-50 rounded-lg">
                    <p className="text-gray-600 text-xs lg:text-sm">Bucket</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-900">{classificationResult.bucket}</p>
                  </div>
                  <div className="text-center p-3 lg:p-4 bg-rose-50 rounded-lg">
                    <p className="text-gray-600 text-xs lg:text-sm">Situation</p>
                    <p className="text-lg lg:text-2xl font-bold text-rose-900 break-words">{classificationResult.situation}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations Table */}
              <RecommendationTable
                situationId={classificationResult.situationId}
                labReportId={classificationResult.labReportId}
                onRecommendationsSaved={handleRecommendationsSaved}
                disabled={anythingSaving}
                onSavingStart={() => setAnythingSaving(true)}
                onSavingEnd={() => setAnythingSaving(false)}
              />

              {/* Medication Recommendation */}
              <MedicationRecommendation
                labReportId={classificationResult.labReportId}
                testValues={testValues}
                classification={classificationResult}
                onSaved={handleMedicationsSaved}
                disabled={anythingSaving}
                onSavingStart={() => setAnythingSaving(true)}
                onSavingEnd={() => setAnythingSaving(false)}
              />

              {/* Trend Analysis for New Patient */}
              <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                <h3 className="text-base lg:text-lg font-semibold text-blue-800 mb-4">Lab Test Trends</h3>
                <p className="text-gray-600 text-sm lg:text-base mb-4">
                  This is the first visit for this patient. Trends will be available after future visits.
                </p>
                <div className="bg-gray-50 rounded-lg p-6 lg:p-8 text-center">
                  <TrendingUp className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm lg:text-base">Trend analysis will be available after multiple visits</p>
                </div>
              </div>

              {/* Complete Registration Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleCompleteRegistration}
                  disabled={anythingSaving}
                  className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-6 lg:px-8 py-3 disabled:bg-gray-400"
                >
                  {anythingSaving ? "Save in progress..." : "Complete Patient Registration"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {currentStep === "complete" && classificationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-4 lg:space-y-6"
            >
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 lg:p-8">
                <CheckCircle className="w-12 h-12 lg:w-16 lg:h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl lg:text-2xl font-bold text-green-800 mb-2">
                  Patient Successfully Registered!
                </h2>
                <p className="text-green-700 text-sm lg:text-base">
                  {form.name} has been registered and initial recommendations have been generated.
                </p>
              </div>

              {/* Patient Report */}
              <PatientReport
                patient={{
                  name: form.name,
                  age: parseInt(form.age),
                  gender: form.gender,
                  nationalid: form.nationalId,
                  contactinfo: form.contactInfo || ""
                }}
                testValues={testValues}
                classification={classificationResult}
                recommendations={savedRecommendations}
                medications={savedMedications}
                visitType="initial"
                doctorName={user?.name || "Dr. [Doctor Name]"}
                visitDate={new Date().toLocaleDateString()}
                notes=""
              />

              {/* Action buttons */}
              <div className="flex flex-col lg:flex-row justify-center gap-3 lg:gap-4 pt-4">
                <Button
                  onClick={handleStartNewRegistration}
                  className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 lg:px-8"
                >
                  Register Another Patient
                </Button>
                <Button
                  onClick={() => window.location.href = '/doctor/dashboard'}
                  className="w-full lg:w-auto bg-gray-600 hover:bg-gray-700 text-white px-6 lg:px-8"
                >
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog - FIXED: Mobile responsive */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-300">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 mr-2" />
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Confirm Complete Registration</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 text-sm lg:text-base mb-3">
                You are about to complete the patient registration, but it appears you haven't saved:
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
                Are you sure you want to complete the registration without saving these items?
              </p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-3">
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