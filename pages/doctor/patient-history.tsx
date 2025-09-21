import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Search, User, Clock, AlertCircle, FileText, History, Trash2 } from "lucide-react";
import DoctorSidebar from "../../components/doctor/DoctorSidebar";
import PatientSearch from "../../components/doctor/PatientSearch";
import PatientHistoryDisplay from "../../components/doctor/PatientHistoryDisplay";
import { Button } from "../../components/ui/button";
import { requireAuthServer } from "../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

type TestResult = {
  id: string;
  value: number;
  testdate: string;
  testtypeid: number;
  TestType: {
    id: number;
    code: string;
    name: string;
    unit: string;
  };
};

type Recommendation = {
  id: string;
  questionid: number;
  selectedoptionid: number;
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
  bucketid: number;
  code: string;
  description: string;
};

type Medication = {
  id: string;
  dosage: number;
  isoutdated: boolean;
  createdat: string;
  outdatedat?: string;
  outdatedreason?: string;
  MedicationType: {
    id: number;
    name: string;
    unit: string;
    groupname: string;
  };
};

type VisitHistory = {
  id: string;
  visitDate: string;
  notes: string;
  situation: Situation | null;
  recommendations: Recommendation[];
  testResults: TestResult[];
  medications?: Medication[];
};

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  nationalid: string;
  contactinfo?: string;
};

export default function PatientHistory() {
  // FIXED: Proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    visitId: string;
    visitDate: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

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

  const handlePatientFound = async (
    patient: any, 
    recentReport: any, 
    recentTests: any[]
  ) => {
    const selectedPatient: Patient = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      nationalid: patient.nationalid,
      contactinfo: patient.contactinfo
    };

    setSelectedPatient(selectedPatient);
    await fetchPatientHistory(selectedPatient.id);
  };

  const fetchPatientHistory = async (patientId: string) => {
    setLoading(true);
    setError(null);
    setVisitHistory([]);
    setExpandedVisits(new Set());

    try {
      const response = await fetch(`/api/doctor/patient/patient-history?patientId=${patientId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient history');
      }

      const data = await response.json();
      setVisitHistory(data.visitHistory || []);
    } catch (err) {
      console.error('Error fetching patient history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch patient history');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTestResults = async (visitId: string, updatedTestResults: TestResult[]) => {
    if (!selectedPatient) return;

    try {
      const testResultsForUpdate = updatedTestResults.map(test => ({
        id: test.id,
        value: test.value
      }));

      console.log(`[PATIENT HISTORY] Sending ${testResultsForUpdate.length} test results for update`);

      const response = await fetch('/api/doctor/patient/edit-test-results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labReportId: visitId,
          testResults: testResultsForUpdate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update test results');
      }

      const result = await response.json();
      console.log(`[PATIENT HISTORY] Update successful:`, result);

      if (result.medicationImpact?.requiresReview) {
        const warningMessage = `⚠️ MEDICATION REVIEW REQUIRED

Test values have changed significantly:
${result.medicationImpact.criticalChanges.join('\n')}

${result.medicationImpact.outdatedMedicationsCount} medication prescription(s) have been marked as outdated and require review.

Please review and update medication dosages based on the new test values.`;
        
        alert(warningMessage);
      }

      await fetchPatientHistory(selectedPatient.id);
      setEditingVisit(null);
      setError(null);
    } catch (err) {
      console.error(`[PATIENT HISTORY] Update error:`, err);
      setError(err instanceof Error ? err.message : 'Failed to update test results');
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    setDeleteLoading(visitId);
  
    if (!selectedPatient) {
      setError("Patient information is missing");
      setDeleteLoading(null);
      setDeleteConfirmation(null);
      return;
    }
    
    try {
      const response = await fetch("/api/doctor/patient/delete-visit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labReportId: visitId,
          patientId: selectedPatient.id,
          deletionReason: "Deleted by doctor"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete visit");
      }

      fetchPatientHistory(selectedPatient.id);
      setDeleteConfirmation(null);
      setError(null);
      
    } catch (error) {
      console.error("Delete visit error:", error);
      setError(error instanceof Error ? error.message : "Failed to delete visit");
    } finally {
      setDeleteLoading(null);
      setDeleteConfirmation(null);
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
    setEditingVisit(null);
    setDeleteConfirmation(null);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content - FIXED: Dynamic margin and no horizontal scroll */}
      <main className={`flex-1 min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100 p-4 lg:p-10 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } overflow-x-hidden`}>
        {/* Mobile/Desktop Menu Button */}
        <button
          className="mb-4 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
          onClick={toggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Page Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xl lg:text-3xl font-bold text-blue-900 mb-4 lg:mb-8 px-2 lg:px-0"
        >
          Patient Medical History
        </motion.h1>

        {!selectedPatient ? (
          /* Search Interface - MOBILE RESPONSIVE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-8 border border-blue-100 mx-2 lg:mx-0"
          >
            <div className="text-center mb-4 lg:mb-8">
              <Search className="w-8 h-8 lg:w-12 lg:h-12 text-blue-600 mx-auto mb-2 lg:mb-4" />
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900 mb-1 lg:mb-2">Search Patient</h2>
              <p className="text-sm lg:text-base text-gray-600 px-2">Enter patient's Hospital ID to view their complete medical history</p>
            </div>

            <PatientSearch onPatientFound={handlePatientFound} />

            <div className="mt-4 lg:mt-8 p-3 lg:p-4 bg-blue-50/80 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2 lg:space-x-3">
                <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1 text-sm lg:text-base">About Patient History</h3>
                  <p className="text-xs lg:text-sm text-blue-700 leading-relaxed">
                    View complete medical history including test results, classifications, and treatment recommendations. 
                    You can edit test results or delete entire visits as needed. All changes are tracked for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Patient History Display - MOBILE RESPONSIVE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-3 lg:space-y-6 mx-2 lg:mx-0"
          >
            {/* Patient Info Header - MOBILE RESPONSIVE */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
                  <User className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg lg:text-2xl font-bold text-gray-900 leading-tight">
                      {selectedPatient.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1 text-xs lg:text-sm text-gray-600">
                      <span>Age: {selectedPatient.age}</span>
                      <span>Gender: {selectedPatient.gender}</span>
                      <span className="break-all">ID: {selectedPatient.nationalid}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleBack}
                  className="w-full sm:w-auto bg-transparent border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base"
                >
                  ← <span className="hidden sm:inline">Back to Search</span><span className="sm:hidden">Back</span>
                </Button>
              </div>
            </div>

            {/* Loading State - MOBILE RESPONSIVE */}
            {loading && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-8 border border-blue-100 text-center">
                <div className="animate-spin w-6 h-6 lg:w-8 lg:h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2 lg:mb-4"></div>
                <p className="text-gray-600 text-sm lg:text-base">Loading patient history...</p>
              </div>
            )}

            {/* Error State - MOBILE RESPONSIVE */}
            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl p-3 lg:p-6">
                <div className="flex items-start space-x-2 lg:space-x-3">
                  <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 text-sm lg:text-base">Error</h3>
                    <p className="text-red-700 mt-1 text-xs lg:text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Visit History - MOBILE RESPONSIVE */}
            {!loading && !error && (
              <div className="space-y-3 lg:space-y-4">
                {visitHistory.length > 0 ? (
                  <>
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <h3 className="text-base lg:text-xl font-bold text-gray-900 flex items-center">
                          <History className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-blue-600" />
                          <span className="hidden sm:inline">Medical History ({visitHistory.length} visits)</span>
                          <span className="sm:hidden">History ({visitHistory.length})</span>
                        </h3>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setExpandedVisits(new Set(visitHistory.map(v => v.id)))}
                            className="flex-1 sm:flex-none text-blue-600 border-blue-300 bg-transparent hover:bg-blue-50 px-3 lg:px-6 py-1.5 lg:py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-xs lg:text-sm"
                          >
                            <span className="hidden sm:inline">Expand All</span>
                            <span className="sm:hidden">Expand</span>
                          </Button>
                          <Button
                            onClick={() => setExpandedVisits(new Set())}
                            className="flex-1 sm:flex-none text-gray-600 border-gray-300 bg-transparent hover:bg-gray-50 px-3 lg:px-6 py-1.5 lg:py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-xs lg:text-sm"
                          >
                            <span className="hidden sm:inline">Collapse All</span>
                            <span className="sm:hidden">Collapse</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {visitHistory.map((visit) => (
                      <PatientHistoryDisplay
                        key={visit.id}
                        visitHistory={visit}
                        isExpanded={expandedVisits.has(visit.id)}
                        isEditing={editingVisit === visit.id}
                        onToggle={() => toggleVisitExpansion(visit.id)}
                        onEdit={() => setEditingVisit(visit.id)}
                        onCancelEdit={() => setEditingVisit(null)}
                        onSaveEdit={(updatedTestResults) => handleEditTestResults(visit.id, updatedTestResults)}
                        onDelete={() => setDeleteConfirmation({
                          visitId: visit.id,
                          visitDate: visit.visitDate
                        })}
                      />
                    ))}
                  </>
                ) : (
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-8 border border-blue-100 text-center">
                    <FileText className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-2 lg:mb-4" />
                    <h3 className="text-base lg:text-xl font-medium text-gray-900 mb-1 lg:mb-2">No Medical History Found</h3>
                    <p className="text-gray-600 text-sm lg:text-base px-4">
                      This patient doesn't have any recorded visits yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Delete Confirmation Modal - MOBILE RESPONSIVE */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-blue-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white/95 backdrop-blur-sm rounded-xl p-4 lg:p-8 max-w-md w-full shadow-2xl border-2 border-blue-200"
            >
              <h3 className="text-lg lg:text-xl font-bold text-blue-900 mb-3 lg:mb-4">Confirm Visit Deletion</h3>
              <p className="text-gray-800 font-medium mb-3 lg:mb-4 text-sm lg:text-base">
                Are you sure you want to delete the visit from{' '}
                <strong className="text-red-700">
                  {new Date(deleteConfirmation.visitDate).toLocaleDateString()}
                </strong>?
              </p>
              <p className="text-xs lg:text-sm text-red-700 mb-4 lg:mb-6 bg-red-50 p-2 lg:p-3 rounded-lg border border-red-200 leading-relaxed">
                <strong>⚠️ Warning:</strong> This action will permanently remove all test results and recommendations for this visit.<br />
                The data will be archived for audit purposes, but can't be recovered.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-end">
                <Button
                  onClick={() => setDeleteConfirmation(null)}
                  disabled={deleteLoading === deleteConfirmation.visitId}
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 lg:px-8 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm lg:text-base"
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => handleDeleteVisit(deleteConfirmation.visitId)}
                  disabled={deleteLoading === deleteConfirmation.visitId}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 lg:px-8 py-2 lg:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 text-sm lg:text-base"
                >
                  {deleteLoading === deleteConfirmation.visitId ? (
                    <>
                      <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="hidden sm:inline">Deleting...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 lg:w-4 lg:h-4 mr-2" />
                      <span className="hidden sm:inline">Delete Visit</span>
                      <span className="sm:hidden">Delete</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}