import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, Search, User, Clock, AlertCircle, FileText } from "lucide-react";
import DoctorSidebar from "../../components/doctor/DoctorSidebar";
import PatientSearch from "../../components/doctor/PatientSearch";
import RecommendationHistoryDisplay from "../../components/doctor/RecommendationHistoryDisplay";
import { Button } from "../../components/ui/button";
import { requireAuthServer } from "../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

// Update the type definitions to match actual database column names

type TestResult = {
  id: string;
  value: number;
  testdate: string; // lowercase to match database
  testtypeid: number; // lowercase to match database
  TestType: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
};

type Recommendation = {
  id: string;
  questionid: number; // lowercase to match database
  selectedoptionid: number; // lowercase to match database
  Question: {
    id: number;
    text: string;
  };
  Option: {
    id: number;
    text: string;
  };
};

type Situation = {
  id: number;
  groupid: number;
  code: string;
  description: string;
};

type VisitHistory = {
  id: string;
  visitDate: string;
  notes: string;
  situation: Situation | null;
  recommendations: Recommendation[];
  testResults: TestResult[];
};

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  nationalid: string; // lowercase to match database
  contactinfo?: string; // lowercase to match database
};

export default function Recommendations() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePatientFound = async (
    patient: any, 
    recentReport: any, 
    recentTests: any[]
  ) => {
    console.log('Patient data received:', patient); // Debug log
    
    // The patient ID from Supabase is already a string, no conversion needed
    const selectedPatient: Patient = {
      id: patient.id, // Keep as string
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      nationalid: patient.nationalid,
      contactinfo: patient.contactinfo
    };

    console.log('Selected patient:', selectedPatient); // Debug log

    setSelectedPatient(selectedPatient);
    setLoading(true);
    setError(null);
    setVisitHistory([]);
    setExpandedVisits(new Set());

    try {
      console.log('Making API request with patientId:', selectedPatient.id); // Debug log
      const response = await fetch(`/api/doctor/patient/recommendation-history?patientId=${selectedPatient.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendation history');
      }

      const data = await response.json();
      setVisitHistory(data.visitHistory || []);
    } catch (err) {
      console.error('Error fetching recommendation history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendation history');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisitExpansion = (visitId: string) => {
    const newExpanded = new Set(expandedVisits);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
    }
    setExpandedVisits(newExpanded);
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setVisitHistory([]);
    setExpandedVisits(new Set());
    setError(null);
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
          Patient Recommendation History
        </motion.h1>

        {!selectedPatient ? (
          /* Search Interface */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white/80 rounded-xl shadow-lg p-8 border border-blue-100"
          >
            <div className="text-center mb-8">
              <Search className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Patient</h2>
              <p className="text-gray-600">Enter patient's National ID to view their recommendation history</p>
            </div>

            <PatientSearch onPatientFound={handlePatientFound} />

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">About Recommendation History</h3>
                  <p className="text-sm text-blue-700">
                    This section allows you to review all previous recommendations given to a patient. 
                    You can view historical test results, classifications, and treatment recommendations 
                    for each visit to track the patient's progress over time.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Patient History Display */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Patient Info Header */}
            <div className="bg-white/90 rounded-xl shadow-lg p-6 border border-blue-100">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <User className="w-8 h-8 text-blue-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>Age: {selectedPatient.age}</span>
                      <span>Gender: {selectedPatient.gender}</span>
                      <span>ID: {selectedPatient.nationalid}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleBack}
                  className="bg-transparent border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  ← Back to Search
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white/80 rounded-xl shadow-lg p-8 border border-blue-100 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading recommendation history...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-900">Error Loading History</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Visit History */}
            {!loading && !error && (
              <div className="space-y-4">
                {visitHistory.length > 0 ? (
                  <>
                    <div className="bg-white/90 rounded-xl shadow-lg p-6 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                          <Clock className="w-6 h-6 mr-2 text-blue-600" />
                          Visit History ({visitHistory.length} visits)
                        </h3>
                        <div className="flex space-x-2">
                          <Button
                              onClick={() => setExpandedVisits(new Set(visitHistory.map(v => v.id)))}
                              className="text-blue-600 border-blue-300 bg-transparent hover:bg-blue-50 text-sm py-1 px-3"
                            >
                              Expand All
                            </Button>
                            <Button
                              onClick={() => setExpandedVisits(new Set())}
                              className="text-gray-600 border-gray-300 bg-transparent hover:bg-gray-50 text-sm py-1 px-3"
                            >
                              Collapse All
                            </Button>
                        </div>
                      </div>
                    </div>

                    {visitHistory.map((visit) => (
                      <RecommendationHistoryDisplay
                        key={visit.id}
                        visitHistory={visit}
                        isExpanded={expandedVisits.has(visit.id)}
                        onToggle={() => toggleVisitExpansion(visit.id)}
                      />
                    ))}
                  </>
                ) : (
                  <div className="bg-white/80 rounded-xl shadow-lg p-8 border border-blue-100 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Visit History Found</h3>
                    <p className="text-gray-600">
                      This patient doesn't have any recorded visits or recommendations yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
