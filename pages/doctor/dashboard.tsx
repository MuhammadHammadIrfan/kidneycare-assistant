import { useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import DoctorSidebar from "../../components/doctor/DoctorSidebar";
import { requireAuthServer } from "../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

export default function DoctorDashboard({ user }: { user: any }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Placeholder stats, replace with real data from API later
  const stats = [
    { label: "My Patients", value: 24, icon: "👥", color: "from-blue-200 to-blue-400" },
    { label: "Visits This Week", value: 12, icon: "🩺", color: "from-rose-200 to-rose-400" },
    { label: "Pending Recommendations", value: 3, icon: "💡", color: "from-yellow-100 to-yellow-300" },
    { label: "Recent Lab Alerts", value: 1, icon: "⚠️", color: "from-orange-100 to-orange-300" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 p-10 lg:ml-64 transition-all">
        {/* Mobile Toggle Button */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-8 flex items-center gap-6 border border-blue-100`}
            >
              <div className="text-4xl">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{stat.value}</div>
                <div className="text-gray-700">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-gradient-to-r from-blue-50 via-white to-rose-100 rounded-xl shadow p-8 border border-blue-100"
        >
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Your Clinical Assistant</h2>
          <p className="text-gray-700 text-lg">
            Stay focused on your patients. <span className="text-rose-700 font-semibold">KidneyCare Assistant</span> helps you track, recommend, and review with confidence and ease.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
