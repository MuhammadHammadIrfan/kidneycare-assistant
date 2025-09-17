import { useState } from "react";
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
  bucketid: number; // Added missing property
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
  nationalid: string;
  contactinfo?: string;
};

export default function PatientHistory() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null); // Store the visitId being deleted

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
      // Only send id and value, not testdate
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

      // **FIX: Handle medication impact warnings here**
      if (result.medicationImpact?.requiresReview) {
        const warningMessage = `⚠️ MEDICATION REVIEW REQUIRED

Test values have changed significantly:
${result.medicationImpact.criticalChanges.join('\n')}

${result.medicationImpact.outdatedMedicationsCount} medication prescription(s) have been marked as outdated and require review.

Please review and update medication dosages based on the new test values.`;
        
        alert(warningMessage);
      }

      // Refresh the patient history
      await fetchPatientHistory(selectedPatient.id);
      setEditingVisit(null);
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error(`[PATIENT HISTORY] Update error:`, err);
      setError(err instanceof Error ? err.message : 'Failed to update test results');
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    setDeleteLoading(visitId); // Set loading for this specific visit
  
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

      // Success - refresh the data
      fetchPatientHistory(selectedPatient.id);
      setDeleteConfirmation(null);
      
      // Show success message (optional)
      setError(null);
      
    } catch (error) {
      console.error("Delete visit error:", error);
      setError(error instanceof Error ? error.message : "Failed to delete visit");
    } finally {
      setDeleteLoading(null); // Clear loading state
      setDeleteConfirmation(null); // Clear confirmation dialog
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
          Patient Medical History
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
              <p className="text-gray-600">Enter patient's National ID to view their complete medical history</p>
            </div>

            <PatientSearch onPatientFound={handlePatientFound} />

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">About Patient History</h3>
                  <p className="text-sm text-blue-700">
                    View complete medical history including test results, classifications, and treatment recommendations. 
                    You can edit test results or delete entire visits as needed. All changes are tracked for audit purposes.
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
                  className="bg-transparent border border-blue-300 text-blue-700 hover:bg-blue-50 !px-6 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  ← Back to Search
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white/80 rounded-xl shadow-lg p-8 border border-blue-100 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading patient history...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-900">Error</h3>
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
                          <History className="w-6 h-6 mr-2 text-blue-600" />
                          Medical History ({visitHistory.length} visits)
                        </h3>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setExpandedVisits(new Set(visitHistory.map(v => v.id)))}
                            className="text-blue-600 border-blue-300 bg-transparent hover:bg-blue-50 !px-6 !py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Expand All
                          </Button>
                          <Button
                            onClick={() => setExpandedVisits(new Set())}
                            className="text-gray-600 border-gray-300 bg-transparent hover:bg-gray-50 !px-6 !py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Collapse All
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
                  <div className="bg-white/80 rounded-xl shadow-lg p-8 border border-blue-100 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Medical History Found</h3>
                    <p className="text-gray-600">
                      This patient doesn't have any recorded visits yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-blue-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-br from-white via-blue-50 to-rose-50 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-200"
            >
              <h3 className="text-xl font-bold text-blue-900 mb-4">Confirm Visit Deletion</h3>
              <p className="text-gray-800 font-medium mb-4">
                Are you sure you want to delete the visit from{' '}
                <strong className="text-red-700">{new Date(deleteConfirmation.visitDate).toLocaleDateString()}</strong>?
              </p>
              <p className="text-sm text-red-700 mb-6 bg-red-50 p-3 rounded-lg border border-red-200">
                <strong>⚠️ Warning:</strong> This action will permanently remove all test results and recommendations for this visit.<br />
                The data will be archived for audit purposes, but can't be recovered.
              </p>
              
              <div className="flex space-x-4 justify-end">
                <Button
                  onClick={() => setDeleteConfirmation(null)}
                  disabled={deleteLoading === deleteConfirmation.visitId}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 !px-8 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => handleDeleteVisit(deleteConfirmation.visitId)}
                  disabled={deleteLoading === deleteConfirmation.visitId}
                  className="bg-red-600 hover:bg-red-700 text-white !px-8 !py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {deleteLoading === deleteConfirmation.visitId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Visit
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