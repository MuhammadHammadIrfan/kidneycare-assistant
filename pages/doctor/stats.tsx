import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Search, Users, TrendingUp } from "lucide-react";
import DoctorSidebar from "../../components/doctor/DoctorSidebar";
import TrendGraph from "../../components/doctor/TrendGraph";
import PatientSearch from "../../components/doctor/PatientSearch";
import { requireAuthServer } from "../../lib/requireAuthServer";

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

export default function LabTestTrends() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showSearch, setShowSearch] = useState(true);

  const handlePatientFound = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowSearch(false);
  };

  const handleNewSearch = () => {
    setSelectedPatient(null);
    setShowSearch(true);
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
          className="text-3xl font-bold text-blue-900 mb-8 flex items-center"
        >
          <TrendingUp className="w-8 h-8 mr-3" />
          Lab Test Trends & Analytics
        </motion.h1>

        {showSearch ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <Search className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Select Patient for Trend Analysis</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Search and select a patient to view their lab test trends over time. 
                This analysis helps identify patterns and treatment effectiveness.
              </p>
            </div>

            <PatientSearch 
              onPatientFound={handlePatientFound}
            />
          </motion.div>
        ) : selectedPatient ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Patient Header */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Users className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedPatient.name}</h2>
                    <p className="text-gray-600">
                      Age: {selectedPatient.age} | ID: {selectedPatient.nationalid}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNewSearch}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Search Another Patient
                </button>
              </div>
            </div>

            {/* Trend Analysis */}
            <TrendGraph 
              patientId={selectedPatient.id} 
              patientName={selectedPatient.name}
              showTitle={true}
              height={500}
            />

            {/* Medical Insights Panel */}
            <div className="bg-white/80 rounded-xl shadow p-6 border border-amber-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                💡 Clinical Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Mineral Metabolism</h4>
                  <p className="text-blue-700">Monitor PTH, Calcium, and Phosphate together for CKD-MBD management.</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Protein Status</h4>
                  <p className="text-green-700">Albumin levels affect calcium binding and corrected calcium calculations.</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Imaging Correlation</h4>
                  <p className="text-purple-700">Echo and LA Rad findings correlate with biochemical abnormalities.</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">Treatment Response</h4>
                  <p className="text-amber-700">Look for trends indicating treatment effectiveness over multiple visits.</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}