import { useState } from "react";
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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"patient" | "tests" | "recommendations" | "complete">("patient");
  
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
    // Don't automatically complete the registration here - let the user choose when to complete
  };

  const handleMedicationsSaved = () => {
    setMedicationsSaved(true);
    setSuccess("Medications saved successfully!");
  };

  const handleCompleteRegistration = () => {
    const hasRecommendations = savedRecommendations.length > 0;
    const hasMedications = medicationsSaved;

    // If both are saved or user wants to proceed anyway, complete the registration
    if (hasRecommendations && hasMedications) {
      fetchMedicationsForReport();
      return;
    }

    // Show confirmation dialog if something is missing
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
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
          Register New Patient
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

        {/* Step 1: Patient Information */}
        {currentStep === "patient" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-xl font-bold text-blue-900 mb-6">Patient Information</h3>
              <PatientForm form={form} onChange={handleFormChange} />
              
              <div className="flex justify-end mt-8">
                <Button
                  onClick={handlePatientSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
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
            className="space-y-6"
          >
            {/* Patient Info Summary */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Patient Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-medium text-gray-900">{form.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Age:</p>
                  <p className="font-medium text-gray-900">{form.age} years</p>
                </div>
                <div>
                  <p className="text-gray-600">National ID:</p>
                  <p className="font-medium text-gray-900">{form.nationalId}</p>
                </div>
              </div>
            </div>

            {/* Test Input */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-xl font-bold text-blue-900 mb-6">Initial Test Results</h3>
              <TestInputTable testValues={testValues} onChange={handleTestChange} />

              <div className="flex justify-between mt-8">
                <Button
                  onClick={() => setCurrentStep("patient")}
                  className="px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                >
                  Back to Patient Info
                </Button>
                <Button
                  onClick={handleTestSubmit}
                  disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-8"
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
            className="space-y-6"
          >
            {/* Patient Summary */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">New Patient Registered</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-medium text-gray-900">{form.name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Age:</p>
                  <p className="font-medium text-gray-900">{form.age} years</p>
                </div>
                <div>
                  <p className="text-gray-600">Patient ID:</p>
                  <p className="font-medium text-gray-900 text-xs">{classificationResult.patientId}</p>
                </div>
              </div>
            </div>

            {/* Classification Result */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Classification Result</h3>
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

            {/* Recommendations Table */}
            <RecommendationTable
              situationId={classificationResult.situationId}
              labReportId={classificationResult.labReportId}
              onRecommendationsSaved={handleRecommendationsSaved}
            />

            {/* Medication Recommendation */}
            <MedicationRecommendation
              labReportId={classificationResult.labReportId}
              testValues={testValues}
              classification={classificationResult}
              onSaved={handleMedicationsSaved}
            />

            {/* Trend Analysis for New Patient */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Lab Test Trends</h3>
              <p className="text-gray-600 mb-4">
                This is the first visit for this patient. Trends will be available after future visits.
              </p>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Trend analysis will be available after multiple visits</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleCompleteRegistration}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                Complete Patient Registration
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
            className="text-center space-y-6"
          >
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Patient Successfully Registered!
              </h2>
              <p className="text-green-700">
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
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleStartNewRegistration}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                Register Another Patient
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
              <h3 className="text-lg font-semibold text-gray-900">Confirm Complete Registration</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                You are about to complete the patient registration, but it appears you haven't saved:
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
                Are you sure you want to complete the registration without saving these items?
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
