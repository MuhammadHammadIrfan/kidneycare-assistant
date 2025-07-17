import React from "react";
import { motion } from "framer-motion";
import AdminSidebar from "../../components/admin/AdminSidebar";

export default function AdminDashboard() {
  // Placeholder stats, replace with real data from API later
  const stats = [
    { label: 'Total Doctors', value: '12', icon: <span className="text-2xl">&#128105;</span> },
    { label: 'Total Patients', value: '50', icon: <span className="text-2xl">&#128104;</span> },
    { label: 'Appointments Today', value: '5', icon: <span className="text-2xl">&#128197;</span> },
    { label: 'New Patients', value: '3', icon: <span className="text-2xl">&#128105;</span> },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <AdminSidebar />
      <main className="flex-1 p-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-blue-900 mb-8"
        >
          Admin Dashboard
        </motion.h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              className="bg-gradient-to-br from-blue-50 via-white to-rose-100 rounded-xl shadow-lg p-8 flex items-center gap-6 border border-blue-100"
            >
              <div className="bg-gradient-to-br from-rose-200 to-blue-100 rounded-full p-3 shadow">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
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
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Welcome, Admin</h2>
          <p className="text-gray-700">
            Use the sidebar to register new doctors or view system statistics. More features coming soon!
          </p>
        </motion.div>
      </main>
    </div>
  );
}