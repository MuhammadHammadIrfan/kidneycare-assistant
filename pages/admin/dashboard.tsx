// pages/admin/dashboard.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, FileText, Activity, TrendingUp, Calendar, Menu, Settings, Eye, EyeOff, X, Lock } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { requireAuthServer } from '../../lib/requireAuthServer';
import Cookies from "js-cookie";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["admin"]);
}

interface DoctorActivityStats {
  totalPatients: number;
  totalReports: number;
  recentReports: number;
  isActive: boolean;
}

interface DoctorActivity {
  id: string;
  name: string;
  email: string;
  patientsCount: number;
  totalReports: number;
  recentReports: number;
  isActive: boolean;
}

interface DashboardStats {
  overview: {
    totalDoctors: number;
    newDoctorsThisMonth: number;
    totalPatients: number;
    newPatientsThisMonth: number;
    totalLabReports: number;
    reportsThisWeek: number;
    activeDoctors: number;
    totalMedications: number;
    medicationsThisWeek: number;
  };
  doctorActivity: DoctorActivity[];
  recentActivity: {
    recentDoctors: any[];
    recentPatients: any[];
  };
}

export default function AdminDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // FIXED: Proper sidebar state management like doctor pages
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  
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

  // FIXED: Initialize sidebar state based on screen size
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
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[DASHBOARD] Fetching stats...');
      
      const response = await fetch('/api/admin/dashboard-stats');
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DASHBOARD] Received data:', data);
        
        // Validate the data structure
        if (data.stats && data.stats.overview && data.stats.doctorActivity) {
          setStats(data.stats);
        } else {
          console.error('[DASHBOARD] Invalid data structure:', data);
          setError('Invalid data structure received from server');
        }
      } else {
        console.error('[DASHBOARD] Failed to fetch:', response.status, response.statusText);
        setError(`Failed to fetch dashboard stats: ${response.status}`);
      }
    } catch (error) {
      console.error('[DASHBOARD] Fetch error:', error);
      setError('Network error occurred while fetching dashboard stats');
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
      const userCookie = Cookies.get('kc_user');
      const userData = userCookie ? JSON.parse(userCookie) : null;

      const res = await fetch('/api/admin/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData?.token}`
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        {/* FIXED: Dynamic margin and prevent horizontal scroll */}
        <main className={`transition-all duration-300 min-h-screen ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } overflow-x-hidden p-4 lg:p-10`}>
          <div className="mb-4">
            <button
              className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
              onClick={toggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        {/* FIXED: Dynamic margin and prevent horizontal scroll */}
        <main className={`transition-all duration-300 min-h-screen ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } overflow-x-hidden p-4 lg:p-10`}>
          <div className="mb-4">
            <button
              className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
              onClick={toggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-4 lg:p-6 mx-2 lg:mx-0">
            <h2 className="text-base lg:text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600 text-sm lg:text-base">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // No stats state
  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        {/* FIXED: Dynamic margin and prevent horizontal scroll */}
        <main className={`transition-all duration-300 min-h-screen ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        } overflow-x-hidden p-4 lg:p-10`}>
          <div className="mb-4">
            <button
              className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
              onClick={toggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-gray-500">No data available</p>
          </div>
        </main>
      </div>
    );
  }

  const mainStats = [
    { 
      label: "Total Doctors", 
      value: stats.overview?.totalDoctors || 0, 
      icon: <Users className="w-6 h-6" />, 
      color: "from-blue-200 to-blue-400",
      subtitle: `${stats.overview?.newDoctorsThisMonth || 0} new this month`
    },
    { 
      label: "Active Doctors", 
      value: stats.overview?.activeDoctors || 0, 
      icon: <Activity className="w-6 h-6" />, 
      color: "from-green-200 to-green-400",
      subtitle: "Recent activity (30 days)"
    },
    { 
      label: "Total Patients", 
      value: stats.overview?.totalPatients || 0, 
      icon: <UserPlus className="w-6 h-6" />, 
      color: "from-purple-200 to-purple-400",
      subtitle: `${stats.overview?.newPatientsThisMonth || 0} new this month`
    },
    { 
      label: "Lab Reports", 
      value: stats.overview?.totalLabReports || 0, 
      icon: <FileText className="w-6 h-6" />, 
      color: "from-orange-200 to-orange-400",
      subtitle: `${stats.overview?.reportsThisWeek || 0} this week`
    },
  ];

  const activityStats = [
    {
      label: "Medications Prescribed",
      value: stats.overview?.totalMedications || 0,
      recent: stats.overview?.medicationsThisWeek || 0,
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      label: "System Activity",
      value: `${stats.overview?.activeDoctors || 0}/${stats.overview?.totalDoctors || 0}`,
      recent: stats.overview?.reportsThisWeek || 0,
      icon: <Calendar className="w-5 h-5" />
    }
  ];

  const topActiveDoctors = stats.doctorActivity
    ?.filter((doctor) => doctor && typeof doctor.recentReports === 'number')
    ?.sort((a, b) => (b.recentReports || 0) - (a.recentReports || 0))
    ?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      {/* FIXED: Dynamic margin based on sidebar state */}
      <main className={`transition-all duration-300 min-h-screen ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } overflow-x-hidden p-4 lg:p-10`}>
        {/* Mobile/Desktop Menu Button */}
        <div className="mb-4">
          <button
            className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
            onClick={toggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="mx-2 lg:mx-0">
          {/* Page Header with Password Update Button */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-4 mb-4 lg:mb-8">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-xl lg:text-3xl font-bold text-blue-900 mb-1">
                <span className="hidden sm:inline">Welcome, {user?.name || "Admin"}</span>
                <span className="sm:hidden">Admin Dashboard</span>
              </h1>
              <p className="text-gray-700 text-sm lg:text-base">
                <span className="hidden sm:inline">Manage your system and monitor activity</span>
                <span className="sm:hidden">System overview</span>
              </p>
            </motion.div>

            {/* Admin Actions */}
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
                onClick={() => {
                  setError(null);
                  fetchDashboardStats();
                }}
                className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-sm lg:text-base"
              >
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden sm:inline">Refresh Data</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </motion.div>
          </div>

          {/* Main Statistics - Mobile Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-8">
            {mainStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`bg-gradient-to-br ${stat.color} backdrop-blur-sm rounded-xl shadow-lg p-3 lg:p-6 border border-blue-100`}
              >
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <div className="text-white">{stat.icon}</div>
                  <div className="text-lg lg:text-2xl font-bold text-blue-900">{stat.value}</div>
                </div>
                <div className="text-blue-800 font-medium text-xs lg:text-sm">{stat.label}</div>
                <div className="text-blue-700 text-xs mt-1 leading-tight">{stat.subtitle}</div>
              </motion.div>
            ))}
          </div>

          {/* Activity Statistics - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-4 lg:mb-8">
            {activityStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <div className="text-blue-600">{stat.icon}</div>
                  <div className="text-right">
                    <div className="text-lg lg:text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs lg:text-sm text-green-600">+{stat.recent} this week</div>
                  </div>
                </div>
                <div className="text-gray-700 font-medium text-sm lg:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Doctor Activity Overview - Mobile Responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-gray-200 mb-4 lg:mb-8"
          >
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
              <span className="hidden sm:inline">Top Active Doctors</span>
              <span className="sm:hidden">Active Doctors</span>
            </h3>
            <div className="space-y-2 lg:space-y-3">
              {topActiveDoctors.length > 0 ? (
                topActiveDoctors.map((doctor, i) => (
                  <div key={doctor.id || i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50/90 backdrop-blur-sm rounded-lg gap-2 sm:gap-0">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm lg:text-base">{doctor.name || 'Unknown Doctor'}</span>
                      <span className="text-gray-600 text-xs lg:text-sm ml-0 sm:ml-2 block sm:inline">{doctor.email || 'No email'}</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs lg:text-sm font-medium text-gray-900">
                        {doctor.patientsCount || 0} patients
                      </div>
                      <div className="text-xs text-blue-600">
                        {doctor.recentReports || 0} recent reports
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm lg:text-base">
                  No active doctors found
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
            {/* Recent Doctors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-gray-200"
            >
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
                <span className="hidden sm:inline">Recent Doctor Registrations</span>
                <span className="sm:hidden">New Doctors</span>
              </h3>
              <div className="space-y-2 lg:space-y-3">
                {stats.recentActivity?.recentDoctors?.length > 0 ? (
                  stats.recentActivity.recentDoctors.slice(0, 5).map((doctor, i) => (
                    <div key={doctor.id || i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50/90 backdrop-blur-sm rounded-lg gap-1 sm:gap-0">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm lg:text-base">{doctor.name || 'Unknown Doctor'}</span>
                        <div className="text-xs lg:text-sm text-gray-600 break-all">{doctor.email || 'No email'}</div>
                      </div>
                      <span className="text-xs text-blue-600 self-start sm:self-auto">
                        {doctor.createdat ? new Date(doctor.createdat).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm lg:text-base">
                    No recent doctor registrations
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Patients */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 lg:p-6 border border-gray-200"
            >
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
                <span className="hidden sm:inline">Recent Patient Registrations</span>
                <span className="sm:hidden">New Patients</span>
              </h3>
              <div className="space-y-2 lg:space-y-3">
                {stats.recentActivity?.recentPatients?.length > 0 ? (
                  stats.recentActivity.recentPatients.slice(0, 5).map((patient, i) => (
                    <div key={patient.id || i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50/90 backdrop-blur-sm rounded-lg gap-1 sm:gap-0">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm lg:text-base">Patient #{(patient.id || '').slice(0, 8) || 'Unknown'}</span>
                        <div className="text-xs lg:text-sm text-gray-600">New registration</div>
                      </div>
                      <span className="text-xs text-green-600 self-start sm:self-auto">
                        {patient.createdat ? new Date(patient.createdat).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm lg:text-base">
                    No recent patient registrations
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
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
                    <span className="hidden sm:inline">Change Password</span>
                    <span className="sm:hidden">Change Password</span>
                  </h3>
                </div>
                <p className="text-gray-700 font-medium text-sm lg:text-base">
                  <span className="hidden sm:inline">Update your admin account password</span>
                  <span className="sm:hidden">Update your password</span>
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
                        <span className="hidden sm:inline">Updating...</span>
                        <span className="sm:hidden">...</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Update Password</span>
                        <span className="sm:hidden">Update</span>
                      </>
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