import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Users, FileText, Activity, AlertTriangle, TrendingUp, Calendar, Pill, Lock, Eye, EyeOff, X } from "lucide-react";
import DoctorSidebar from "../../components/doctor/DoctorSidebar";
import { requireAuthServer } from "../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

interface DashboardStats {
  patients: {
    total: number;
    newThisMonth: number;
    active: number;
    needingFollowup: number;
  };
  labReports: {
    total: number;
    thisWeek: number;
  };
  medications: {
    total: number;
    thisWeek: number;
  };
  recommendations: {
    total: number;
    thisWeek: number;
  };
  classification: {
    group1: number;
    group2: number;
    bucket1: number;
    bucket2: number;
    bucket3: number;
  };
}

interface RecentActivity {
  recentReports: any[];
  recentMedications: any[];
  criticalAlerts: any[];
}

export default function DoctorDashboard({ user }: { user: any }) {
  // FIXED: Proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

  // Password update modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/doctor/dashboard/stats'),
        fetch('/api/doctor/dashboard/recent-activity')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivity(activityData.activity);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Password update functions
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordUpdateLoading(true);
    setPasswordUpdateError(null);
    setPasswordUpdateSuccess(null);

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordUpdateError("New passwords don't match");
      setPasswordUpdateLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordUpdateError("New password must be at least 6 characters long");
      setPasswordUpdateLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/doctor/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordUpdateError(data.error || 'Failed to update password');
      } else {
        setPasswordUpdateSuccess('Password updated successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordUpdateSuccess(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Password update error:', error);
      setPasswordUpdateError('An error occurred. Please try again.');
    } finally {
      setPasswordUpdateLoading(false);
    }
  };

  const resetPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordUpdateError(null);
    setPasswordUpdateSuccess(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const mainStats = stats ? [
    { 
      label: "Total Patients", 
      value: stats.patients.total, 
      icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />, 
      color: "from-blue-200 to-blue-400",
      subtitle: `${stats.patients.newThisMonth} new this month`
    },
    { 
      label: "Active Patients", 
      value: stats.patients.active, 
      icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" />, 
      color: "from-green-200 to-green-400",
      subtitle: "Recent visits (30 days)"
    },
    { 
      label: "Lab Reports", 
      value: stats.labReports.total, 
      icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />, 
      color: "from-purple-200 to-purple-400",
      subtitle: `${stats.labReports.thisWeek} this week`
    },
    { 
      label: "Follow-ups Needed", 
      value: stats.patients.needingFollowup, 
      icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, 
      color: "from-orange-200 to-orange-400",
      subtitle: "No recent visits (60+ days)"
    },
  ] : [];

  const treatmentStats = stats ? [
    {
      label: "Medications Prescribed",
      value: stats.medications.total,
      recent: stats.medications.thisWeek,
      icon: <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
    },
    {
      label: "Treatment Recommendations",
      value: stats.recommendations.total,
      recent: stats.recommendations.thisWeek,
      icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        {/* FIXED: Dynamic margin based on sidebar state */}
        <main className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } p-4 sm:p-6 lg:p-10`}>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* FIXED: Dynamic margin based on sidebar state */}
      <main className={`flex-1 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } p-4 sm:p-6 lg:p-10`}>
        {/* Mobile/Desktop Menu Button */}
        <div className="mb-4">
          <button
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
            onClick={toggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Welcome Header with Actions */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-4 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">
              Welcome, Dr. {user?.name || "Doctor"}
            </h1>
            <p className="text-blue-700 text-sm sm:text-base opacity-80">
              Here's your medical practice overview
            </p>
          </motion.div>

          {/* Doctor Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-2 lg:gap-3"
          >
            <button
              onClick={() => {
                resetPasswordModal();
                setShowPasswordModal(true);
              }}
              className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-sm lg:text-base"
            >
              <Lock className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Change Password</span>
              <span className="sm:hidden">Password</span>
            </button>
            
            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-sm lg:text-base"
            >
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </motion.div>
        </div>

        {/* Main Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {mainStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-white">{stat.icon}</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900">{stat.value}</div>
              </div>
              <div className="text-blue-800 font-medium text-xs sm:text-sm">{stat.label}</div>
              <div className="text-blue-700 text-xs mt-1">{stat.subtitle}</div>
            </motion.div>
          ))}
        </div>

        {/* Treatment Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {treatmentStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-blue-600">{stat.icon}</div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-green-600">+{stat.recent} this week</div>
                </div>
              </div>
              <div className="text-gray-700 font-medium text-sm sm:text-base">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Classification Distribution */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Patient Classification Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Vascular Classification</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Positive (+ve)</span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                      {stats.classification.group1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Negative (-ve)</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                      {stats.classification.group2}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Parathyroid Hormone Range</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Low-Turnover</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                      {stats.classification.bucket1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Within-Range</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                      {stats.classification.bucket2}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">High-Turnover</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                      {stats.classification.bucket3}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Critical Alerts */}
        {activity?.criticalAlerts && activity.criticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="bg-red-50 rounded-xl shadow-lg p-4 sm:p-6 border border-red-200 mb-6 sm:mb-8"
          >
            <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Critical Test Values
            </h3>
            <div className="space-y-3">
              {activity.criticalAlerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-red-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm sm:text-base block truncate">{alert.patientName}</span>
                      <span className="text-gray-600 text-xs sm:text-sm">
                        {alert.testName}: {alert.value} {alert.unit}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium self-start sm:self-center flex-shrink-0 ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity - UPDATED WITH CLINICAL INTERPRETATION */}
        {activity?.recentReports && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Lab Reports</h3>
            <div className="space-y-3">
              {activity.recentReports.slice(0, 5).map((report, i) => {
                const patient = Array.isArray(report.Patient) ? report.Patient[0] : report.Patient;
                const situation = Array.isArray(report.Situation) ? report.Situation[0] : report.Situation;
                
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm sm:text-base block truncate">{patient?.name || 'Unknown'}</span>
                      <span className="text-gray-600 text-xs sm:text-sm">
                        {new Date(report.reportdate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* UPDATED: Clinical interpretation instead of business code */}
                    {situation && (
                      <div className="flex flex-wrap gap-1 items-center self-start sm:self-center">
                        {/* Vascular Classification */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          situation.groupid === 1 
                            ? 'bg-red-100/80 text-red-800' 
                            : 'bg-green-100/80 text-green-800'
                        }`}>
                          {situation.groupid === 1 ? 'Vascular (+)' : 'Vascular (-)'}
                        </span>
                        
                        {/* PTH Range */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          situation.bucketid === 1 || situation.bucketid === 3
                            ? 'bg-orange-100/80 text-orange-800' 
                            : 'bg-blue-100/80 text-blue-800'
                        }`}>
                          PTH: {
                            situation.bucketid === 1 ? 'Low' :
                            situation.bucketid === 2 ? 'Normal' :
                            situation.bucketid === 3 ? 'High' :
                            'Unknown'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      {/* Password Update Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-blue-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-br from-white/95 via-blue-50/90 to-amber-50/90 backdrop-blur-sm rounded-xl shadow-2xl border border-blue-200 p-4 lg:p-8 w-full max-w-md mx-4 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>

              {/* Modal Header */}
              <div className="mb-4 lg:mb-6">
                <div className="flex items-center mb-2">
                  <Lock className="w-6 h-6 lg:w-8 lg:h-8 text-amber-600 mr-3" />
                  <h3 className="text-lg lg:text-2xl font-bold text-blue-900">
                    Change Password
                  </h3>
                </div>
                <p className="text-gray-700 font-medium text-sm lg:text-base">
                  Update your account password
                </p>
              </div>
              
              {/* Password Form */}
              <form onSubmit={handlePasswordUpdate} className="space-y-4 lg:space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                      className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                    </button>
                  </div>
                </div>
                
                {/* New Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">At least 6 characters</p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                      className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {passwordUpdateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm text-center bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-md p-3"
                  >
                    {passwordUpdateError}
                  </motion.div>
                )}

                {/* Success Message */}
                {passwordUpdateSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-600 text-sm text-center bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-md p-3"
                  >
                    {passwordUpdateSuccess}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 text-gray-700 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm text-sm lg:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordUpdateLoading}
                    className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                  >
                    {passwordUpdateLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-3 h-3 lg:w-4 lg:h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}