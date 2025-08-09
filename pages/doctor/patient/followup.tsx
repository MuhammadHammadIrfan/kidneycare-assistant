import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, User, TestTube, FileText, CheckCircle } from "lucide-react";
import DoctorSidebar from "../../../components/doctor/DoctorSidebar";
import PatientSearch from "../../../components/doctor/PatientSearch";
import TestInputTable from "../../../components/doctor/TestInputTable";
import RecommendationTable from "../../../components/doctor/RecommendationTable";
import PatientReport from "../../../components/doctor/PatientReport";
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

export default function FollowUpVisits({user}: {user:any}) {
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

  const handlePatientFound = (patient: Patient, report: RecentReport | null, tests: TestResult[]) => {
    setSelectedPatient(patient);
    setRecentReport(report);
    setRecentTests(tests);
    setCurrentStep("tests");
    setError(null);
    setSuccess(null);
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTestValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTests = async () => {
    if (!selectedPatient) return;
    
    // Validate required fields
    const requiredFields = ["PTH", "Ca", "Albumin", "Phos", "Echo", "LARad"];
    const missingFields = requiredFields.filter(field => !testValues[field as keyof typeof testValues]);
    
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

      setCurrentStep("recommendations");
      setSuccess("Test results submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationsSaved = (recommendations: any[]) => {
    setSavedRecommendations(recommendations);
    setCurrentStep("complete");
    setSuccess("Follow-up visit completed successfully!");
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
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "search", label: "Search Patient", icon: User },
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
            {/* Patient Info Summary */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Patient Information</h3>
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
                  <p className="text-gray-600">National ID:</p>
                  <p className="font-medium text-gray-900">{selectedPatient.nationalid}</p>
                </div>
              </div>
            </div>

            {/* Test Input */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">New Test Results</h3>
              <TestInputTable testValues={testValues} onChange={handleTestChange} />
              
              <div className="mt-6">
                <label className="block text-gray-700 mb-2 font-medium">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this visit..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-black h-24 resize-none"
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  onClick={() => setCurrentStep("search")}
                  className="px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                >
                  Back to Search
                </Button>
                <Button
                  onClick={handleSubmitTests}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                  {loading ? "Processing..." : "Submit Test Results"}
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

            <div className="flex justify-center">
              <Button
                onClick={() => handleRecommendationsSaved([])}
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
            className="space-y-6"
          >
            <div className="text-center">
              <div className="bg-white/80 rounded-xl shadow p-8 border border-green-200 mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-800 mb-4">Follow-up Visit Completed!</h3>
                <p className="text-gray-700 mb-6">
                  The follow-up visit for {selectedPatient?.name} has been successfully recorded with new test results and recommendations.
                </p>
                <Button
                  onClick={handleStartNewVisit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                  Start New Follow-up Visit
                </Button>
              </div>
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
              visitType="followup"
              doctorName={user?.name || "Dr. [Doctor Name]"}
              visitDate={new Date().toLocaleDateString()}
              notes={notes}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
