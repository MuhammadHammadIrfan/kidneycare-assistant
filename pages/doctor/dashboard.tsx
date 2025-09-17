import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Users, FileText, Activity, AlertTriangle, TrendingUp, Calendar, Pill } from "lucide-react";
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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

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

  const mainStats = stats ? [
    { 
      label: "Total Patients", 
      value: stats.patients.total, 
      icon: <Users className="w-6 h-6" />, 
      color: "from-blue-200 to-blue-400",
      subtitle: `${stats.patients.newThisMonth} new this month`
    },
    { 
      label: "Active Patients", 
      value: stats.patients.active, 
      icon: <Activity className="w-6 h-6" />, 
      color: "from-green-200 to-green-400",
      subtitle: "Recent visits (30 days)"
    },
    { 
      label: "Lab Reports", 
      value: stats.labReports.total, 
      icon: <FileText className="w-6 h-6" />, 
      color: "from-purple-200 to-purple-400",
      subtitle: `${stats.labReports.thisWeek} this week`
    },
    { 
      label: "Follow-ups Needed", 
      value: stats.patients.needingFollowup, 
      icon: <Calendar className="w-6 h-6" />, 
      color: "from-orange-200 to-orange-400",
      subtitle: "No recent visits (60+ days)"
    },
  ] : [];

  const treatmentStats = stats ? [
    {
      label: "Medications Prescribed",
      value: stats.medications.total,
      recent: stats.medications.thisWeek,
      icon: <Pill className="w-5 h-5" />
    },
    {
      label: "Treatment Recommendations",
      value: stats.recommendations.total,
      recent: stats.recommendations.thisWeek,
      icon: <TrendingUp className="w-5 h-5" />
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
        <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-10 lg:ml-64 transition-all">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          Welcome, Dr. {user?.name || "Doctor"}
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

        {/* Treatment Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {treatmentStats.map((stat, i) => (
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

        {/* Classification Distribution */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Classification Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">By Group</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Group 1</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {stats.classification.group1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Group 2</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                      {stats.classification.group2}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3">By Bucket</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bucket 1</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-medium">
                      {stats.classification.bucket1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bucket 2</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">
                      {stats.classification.bucket2}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bucket 3</span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
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
            className="bg-red-50 rounded-xl shadow-lg p-6 border border-red-200 mb-8"
          >
            <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Critical Test Values
            </h3>
            <div className="space-y-3">
              {activity.criticalAlerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900">{alert.patientName}</span>
                      <span className="text-gray-600 text-sm ml-2">
                        {alert.testName}: {alert.value} {alert.unit}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
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

        {/* Recent Activity */}
        {activity?.recentReports && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Lab Reports</h3>
            <div className="space-y-3">
              {activity.recentReports.slice(0, 5).map((report, i) => {
                const patient = Array.isArray(report.Patient) ? report.Patient[0] : report.Patient;
                const situation = Array.isArray(report.Situation) ? report.Situation[0] : report.Situation;
                
                return (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{patient?.name || 'Unknown'}</span>
                      <span className="text-gray-600 text-sm ml-2">
                        {new Date(report.reportdate).toLocaleDateString()}
                      </span>
                    </div>
                    {situation && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {situation.code}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
