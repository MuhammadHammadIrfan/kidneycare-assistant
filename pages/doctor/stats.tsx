import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Search, Users, TrendingUp, AlertCircle } from "lucide-react";
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
  // FIXED: Proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showSearch, setShowSearch] = useState(true);

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
      <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content - FIXED: Dynamic margin based on sidebar state */}
      <main className={`flex-1 min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100 p-4 lg:p-10 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* Mobile/Desktop Menu Button */}
        <button
          className="mb-4 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
          onClick={toggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Page Title - MOBILE RESPONSIVE */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xl lg:text-3xl font-bold text-blue-900 mb-4 lg:mb-8 flex items-center px-2 lg:px-0"
        >
          <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3 flex-shrink-0" />
          <span className="hidden sm:inline">Lab Test Trends & Analytics</span>
          <span className="sm:hidden">Lab Trends</span>
        </motion.h1>

        {showSearch ? (
          /* Search Interface - MOBILE RESPONSIVE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4 lg:space-y-6 mx-2 lg:mx-0"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
              <div className="flex items-center mb-3 lg:mb-4">
                <Search className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 mr-2 lg:mr-3 flex-shrink-0" />
                <h2 className="text-base lg:text-xl font-semibold text-gray-900">
                  <span className="hidden sm:inline">Select Patient for Trend Analysis</span>
                  <span className="sm:hidden">Select Patient</span>
                </h2>
              </div>
              <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6 leading-relaxed">
                <span className="hidden sm:inline">
                  Search and select a patient to view their lab test trends over time. 
                  This analysis helps identify patterns and treatment effectiveness.
                </span>
                <span className="sm:hidden">
                  Search for a patient to analyze their lab test trends and treatment patterns.
                </span>
              </p>
            </div>

            {/* Patient Search Component */}
            <PatientSearch 
              onPatientFound={handlePatientFound}
            />

            {/* Mobile Instructions */}
            <div className="bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded-xl p-3 lg:p-4 lg:hidden">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1 text-sm">Mobile Tip</h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Charts are optimized for mobile viewing. Rotate device to landscape for better chart visibility.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : selectedPatient ? (
          /* Patient Analysis View - MOBILE RESPONSIVE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4 lg:space-y-6 mx-2 lg:mx-0"
          >
            {/* Patient Header - MOBILE RESPONSIVE */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base lg:text-xl font-semibold text-gray-900 leading-tight">
                      {selectedPatient.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                      <p className="text-xs lg:text-sm text-gray-600">
                        Age: {selectedPatient.age}
                      </p>
                      <p className="text-xs lg:text-sm text-gray-600 break-all">
                        ID: {selectedPatient.nationalid}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNewSearch}
                  className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white px-3 lg:px-4 py-2 lg:py-2 rounded-lg transition-colors text-sm lg:text-base font-medium shadow-sm hover:shadow-md"
                >
                  <span className="hidden sm:inline">Search Another Patient</span>
                  <span className="sm:hidden">New Search</span>
                </button>
              </div>
            </div>

            {/* Trend Analysis - MOBILE RESPONSIVE */}
            <TrendGraph 
              patientId={selectedPatient.id} 
              patientName={selectedPatient.name}
              showTitle={true}
              height={500}
            />

            {/* Medical Insights Panel - MOBILE RESPONSIVE */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-amber-100">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4 flex items-center">
                <span className="text-lg lg:text-xl mr-2">💡</span>
                <span className="hidden sm:inline">Clinical Insights</span>
                <span className="sm:hidden">Insights</span>
              </h3>
              
              {/* Mobile: Single column, Desktop: 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 text-sm lg:text-sm">
                <div className="bg-blue-50/90 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-900 mb-1 lg:mb-2 text-sm lg:text-base">
                    <span className="hidden sm:inline">Mineral Metabolism</span>
                    <span className="sm:hidden">Minerals</span>
                  </h4>
                  <p className="text-blue-700 text-xs lg:text-sm leading-relaxed">
                    <span className="hidden sm:inline">
                      Monitor PTH, Calcium, and Phosphate together for CKD-MBD management.
                    </span>
                    <span className="sm:hidden">
                      Track PTH, Ca, and Phos for CKD-MBD care.
                    </span>
                  </p>
                </div>
                
                <div className="bg-green-50/90 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-900 mb-1 lg:mb-2 text-sm lg:text-base">
                    <span className="hidden sm:inline">Protein Status</span>
                    <span className="sm:hidden">Protein</span>
                  </h4>
                  <p className="text-green-700 text-xs lg:text-sm leading-relaxed">
                    <span className="hidden sm:inline">
                      Albumin levels affect calcium binding and corrected calcium calculations.
                    </span>
                    <span className="sm:hidden">
                      Albumin affects Ca binding and corrections.
                    </span>
                  </p>
                </div>
                
                <div className="bg-purple-50/90 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-900 mb-1 lg:mb-2 text-sm lg:text-base">
                    <span className="hidden sm:inline">Imaging Correlation</span>
                    <span className="sm:hidden">Imaging</span>
                  </h4>
                  <p className="text-purple-700 text-xs lg:text-sm leading-relaxed">
                    <span className="hidden sm:inline">
                      Echo and LA Rad findings correlate with biochemical abnormalities.
                    </span>
                    <span className="sm:hidden">
                      Echo and LA Rad link to lab abnormalities.
                    </span>
                  </p>
                </div>
                
                <div className="bg-amber-50/90 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-amber-100">
                  <h4 className="font-medium text-amber-900 mb-1 lg:mb-2 text-sm lg:text-base">
                    <span className="hidden sm:inline">Treatment Response</span>
                    <span className="sm:hidden">Treatment</span>
                  </h4>
                  <p className="text-amber-700 text-xs lg:text-sm leading-relaxed">
                    <span className="hidden sm:inline">
                      Look for trends indicating treatment effectiveness over multiple visits.
                    </span>
                    <span className="sm:hidden">
                      Track treatment trends across visits.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile-specific Tips */}
            <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/90 backdrop-blur-sm rounded-xl p-4 border border-indigo-200 lg:hidden">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center">
                <span className="text-base mr-2">📱</span>
                Mobile Chart Tips
              </h3>
              <ul className="space-y-1 text-xs text-indigo-700">
                <li>• <strong>Tap</strong> chart points for detailed values</li>
                <li>• <strong>Swipe</strong> to scroll through chart sections</li>
                <li>• <strong>Rotate</strong> device for better chart viewing</li>
                <li>• Use <strong>"Groups"</strong> view for organized data</li>
              </ul>
            </div>
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}