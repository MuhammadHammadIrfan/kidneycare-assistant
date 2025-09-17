// pages/admin/dashboard.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, FileText, Activity, TrendingUp, Calendar } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { requireAuthServer } from '../../lib/requireAuthServer';

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

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar />
        <main className="flex-1 ml-64 overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar />
        <main className="flex-1 ml-64 overflow-y-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <AdminSidebar />
        <main className="flex-1 ml-64 overflow-y-auto">
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

  // FIXED: Safe sorting with proper null checks
  const topActiveDoctors = stats.doctorActivity
    ?.filter((doctor) => doctor && typeof doctor.recentReports === 'number') // Filter out invalid entries
    ?.sort((a, b) => (b.recentReports || 0) - (a.recentReports || 0)) // Safe sorting
    ?.slice(0, 5) || []; // Default to empty array

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <AdminSidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-blue-900 mb-8"
          >
            Welcome, {user?.name || "Admin"}
          </motion.h1>

          {/* Main Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {mainStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-6 border border-blue-100`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white">{stat.icon}</div>
                  <div className="text-2xl font-bold text-blue-900">{stat.value}</div>
                </div>
                <div className="text-blue-800 font-medium text-sm">{stat.label}</div>
                <div className="text-blue-700 text-xs mt-1">{stat.subtitle}</div>
              </motion.div>
            ))}
          </div>

          {/* Activity Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {activityStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-blue-600">{stat.icon}</div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-green-600">+{stat.recent} this week</div>
                  </div>
                </div>
                <div className="text-gray-700 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Doctor Activity Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Active Doctors</h3>
            <div className="space-y-3">
              {topActiveDoctors.length > 0 ? (
                topActiveDoctors.map((doctor, i) => (
                  <div key={doctor.id || i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{doctor.name || 'Unknown Doctor'}</span>
                      <span className="text-gray-600 text-sm ml-2">{doctor.email || 'No email'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {doctor.patientsCount || 0} patients
                      </div>
                      <div className="text-xs text-blue-600">
                        {doctor.recentReports || 0} recent reports
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No active doctors found
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Doctors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Doctor Registrations</h3>
              <div className="space-y-3">
                {stats.recentActivity?.recentDoctors?.length > 0 ? (
                  stats.recentActivity.recentDoctors.slice(0, 5).map((doctor, i) => (
                    <div key={doctor.id || i} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{doctor.name || 'Unknown Doctor'}</span>
                        <div className="text-sm text-gray-600">{doctor.email || 'No email'}</div>
                      </div>
                      <span className="text-xs text-blue-600">
                        {doctor.createdat ? new Date(doctor.createdat).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
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
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Patient Registrations</h3>
              <div className="space-y-3">
                {stats.recentActivity?.recentPatients?.length > 0 ? (
                  stats.recentActivity.recentPatients.slice(0, 5).map((patient, i) => (
                    <div key={patient.id || i} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">Patient #{(patient.id || '').slice(0, 8) || 'Unknown'}</span>
                        <div className="text-sm text-gray-600">New registration</div>
                      </div>
                      <span className="text-xs text-green-600">
                        {patient.createdat ? new Date(patient.createdat).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No recent patient registrations
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}