// pages/admin/doctors.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Edit, Trash2, Users, Activity, FileText, Plus, Eye, EyeOff, X, Menu } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { requireAuthServer } from '../../lib/requireAuthServer';

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["admin"]);
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  createdat: string;
  active: boolean;
  deactivatedat?: string;
  role: string;
  stats: {
    totalPatients: number;
    totalReports: number;
    recentReports: number;
    isActive: boolean;
  };
}

export default function DoctorsManagement({ user }: { user: any }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // FIXED: Add proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);

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

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    fetchDoctors();
  }, [showInactive]); // Remove searchTerm from here

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (showInactive) params.append('includeInactive', 'true');
      
      const url = `/api/admin/doctors${params.toString() ? '?' + params.toString() : ''}`;
      
      console.log('[FRONTEND] Fetching doctors with URL:', url);
      console.log('[FRONTEND] showInactive:', showInactive);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('[FRONTEND] Received doctors:', data.doctors.length);
        console.log('[FRONTEND] Active doctors:', data.doctors.filter((d: Doctor) => d.active).length);
        console.log('[FRONTEND] Inactive doctors:', data.doctors.filter((d: Doctor) => !d.active).length);
        setDoctors(data.doctors);
      } else {
        console.error('Failed to fetch doctors:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setEditForm({
      name: doctor.name,
      email: doctor.email,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingDoctor) return;

    try {
      setUpdateLoading(true);
      const response = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: editingDoctor.id,
          name: editForm.name,
          email: editForm.email,
          password: editForm.password || undefined
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingDoctor(null);
        fetchDoctors();
        alert('Doctor updated successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update doctor');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update doctor');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (doctor: Doctor) => {
    let confirmMessage = '';
    let actionText = '';
    
    if (doctor.active) {
      confirmMessage = `Are you sure you want to deactivate Dr. ${doctor.name}?\n\n` +
                      `⚠️ What happens when deactivated:\n` +
                      `• Doctor cannot log into the system\n` +
                      `• All patient data and reports remain intact\n` +
                      `• Patient relationships are preserved\n` +
                      `• Can be reactivated later by admin\n\n` +
                      `This action is reversible.`;
      actionText = 'deactivate';
    } else {
      confirmMessage = `Are you sure you want to reactivate Dr. ${doctor.name}?\n\n` +
                      `✅ What happens when reactivated:\n` +
                      `• Doctor can log into the system again\n` +
                      `• All previous data remains accessible\n` +
                      `• Patient relationships are restored\n\n` +
                      `This will restore full access.`;
      actionText = 'reactivate';
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleteLoading(doctor.id);
      const response = await fetch('/api/admin/doctors', {
        method: doctor.active ? 'DELETE' : 'PUT', // Use PUT for reactivation
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          doctorId: doctor.id,
          action: doctor.active ? 'deactivate' : 'reactivate'
        })
      });

      if (response.ok) {
        fetchDoctors();
        alert(`Doctor ${doctor.name} ${actionText}d successfully!`);
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${actionText} doctor`);
      }
    } catch (error) {
      console.error(`${actionText} failed:`, error);
      alert(`Failed to ${actionText} doctor`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredDoctors = doctors;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* FIXED: Update sidebar usage */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      {/* FIXED: Update main content with dynamic margin */}
      <main className={`flex-1 min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100 p-4 lg:p-10 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      }`}>
        {/* FIXED: Update Mobile Menu Button */}
        <button
          className="lg:hidden mb-4 p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md"
          onClick={toggleSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="mx-2 lg:mx-0">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 lg:mb-8"
          >
            <h1 className="text-xl lg:text-3xl font-bold text-blue-900 mb-1 lg:mb-2">
              <span className="hidden sm:inline">Doctors Management</span>
              <span className="sm:hidden">Manage Doctors</span>
            </h1>
            <p className="text-gray-800 font-medium text-sm lg:text-base">
              <span className="hidden sm:inline">Manage doctor accounts and view their activity</span>
              <span className="sm:hidden">Manage doctor accounts</span>
            </p>
          </motion.div>

          {/* Search and Stats - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-8">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 lg:w-5 lg:h-5" />
                <input
                  type="text"
                  placeholder="Search doctors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 lg:pl-10 pr-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 font-medium text-sm lg:text-base"
                />
              </div>
            </motion.div>

            {/* Quick Stats - Mobile Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-blue-50/90 backdrop-blur-sm rounded-lg p-3 lg:p-4 border border-blue-200"
            >
              <div className="flex items-center">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 mr-2 lg:mr-3" />
                <div>
                  <div className="text-lg lg:text-2xl font-bold text-gray-900">{doctors.length}</div>
                  <div className="text-xs lg:text-sm text-gray-800 font-semibold">Total</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-green-50/90 backdrop-blur-sm rounded-lg p-3 lg:p-4 border border-green-200"
            >
              <div className="flex items-center">
                <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 mr-2 lg:mr-3" />
                <div>
                  <div className="text-lg lg:text-2xl font-bold text-gray-900">
                    {doctors.filter(d => d.stats.isActive).length}
                  </div>
                  <div className="text-xs lg:text-sm text-gray-800 font-semibold">Active</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Doctors List - Mobile Responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200"
          >
            {/* Header */}
            <div className="p-3 lg:p-6 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-4">
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">All Doctors</h3>
                  <p className="text-xs lg:text-sm text-gray-600 mt-1">
                    {doctors.filter(d => d.active).length} active, {doctors.filter(d => !d.active).length} deactivated
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center">
                    <label className="flex items-center text-xs lg:text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3 lg:h-4 lg:w-4"
                      />
                      <span className={showInactive ? 'text-blue-600 font-semibold' : 'text-gray-700'}>
                        <span className="hidden sm:inline">Show Deactivated</span>
                        <span className="sm:hidden">Deactivated</span>
                      </span>
                    </label>
                  </div>
                  {showInactive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <span className="hidden sm:inline">Including Deactivated</span>
                      <span className="sm:hidden">+ Deactivated</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex justify-center items-center py-8 lg:py-12">
                <div className="animate-spin rounded-full h-6 lg:h-8 lg:w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-8 lg:py-12">
                <Users className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-3 lg:mb-4" />
                <p className="text-gray-500 text-sm lg:text-base">
                  {searchTerm 
                    ? 'No doctors found matching your search.' 
                    : showInactive 
                      ? 'No doctors found.' 
                      : 'No active doctors found.'
                  }
                </p>
              </div>
            ) : (
              /* Mobile: Card View, Desktop: Table View */
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden">
                  <div className="p-3 space-y-3">
                    {filteredDoctors.map((doctor) => (
                      <div key={doctor.id} className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
                        {/* Doctor Info */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 text-sm">{doctor.name}</div>
                            <div className="text-xs text-gray-600 break-all">{doctor.email}</div>
                            <div className="text-xs text-gray-500">ID: {doctor.id.slice(0, 8)}...</div>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            doctor.active
                              ? doctor.stats.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {doctor.active 
                              ? (doctor.stats.isActive ? 'Active' : 'Inactive') 
                              : 'Deactivated'
                            }
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                          <div className="flex space-x-3">
                            <span>{doctor.stats.totalPatients} patients</span>
                            <span>{doctor.stats.totalReports} reports</span>
                          </div>
                          <span>{new Date(doctor.createdat).toLocaleDateString()}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(doctor)}
                            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(doctor)}
                            disabled={deleteLoading === doctor.id}
                            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                              doctor.active 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {deleteLoading === doctor.id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent mx-auto" />
                            ) : (
                              doctor.active ? 'Deactivate' : 'Reactivate'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor Info
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Activity Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDoctors.map((doctor) => (
                        <tr key={doctor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                              <div className="text-sm text-gray-600">{doctor.email}</div>
                              <div className="text-xs text-gray-500">ID: {doctor.id.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-4 text-sm">
                              <div className="flex items-center">
                                <Users className="w-4 h-4 text-blue-500 mr-1" />
                                <span className="text-gray-800 font-medium">{doctor.stats.totalPatients} patients</span>
                              </div>
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-gray-800 font-medium">{doctor.stats.totalReports} reports</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 font-medium mt-1">
                              {doctor.stats.recentReports} recent reports
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              doctor.active
                                ? doctor.stats.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {doctor.active 
                                ? (doctor.stats.isActive ? 'Active' : 'Inactive') 
                                : 'Deactivated'
                            }
                            </span>
                            {!doctor.active && doctor.deactivatedat && (
                              <div className="text-xs text-gray-500 mt-1">
                                Deactivated: {new Date(doctor.deactivatedat).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {new Date(doctor.createdat).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(doctor)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(doctor)}
                                disabled={deleteLoading === doctor.id}
                                className={`px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                                  doctor.active 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {deleteLoading === doctor.id ? (
                                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  doctor.active ? (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-1 inline" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Activity className="w-4 h-4 mr-1 inline" />
                                      Reactivate
                                    </>
                                  )
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>

          {/* Enhanced Edit Modal - Mobile Responsive */}
          {showEditModal && editingDoctor && (
            <div className="fixed inset-0 bg-blue-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-gradient-to-br from-white/95 via-blue-50/90 to-rose-50/90 backdrop-blur-sm rounded-xl shadow-2xl border border-blue-200 p-4 lg:p-8 w-full max-w-lg mx-4 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowEditModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>

                {/* Modal Header */}
                <div className="mb-4 lg:mb-6">
                  <h3 className="text-lg lg:text-2xl font-bold text-blue-900 mb-1 lg:mb-2">
                    <span className="hidden sm:inline">Edit Doctor Profile</span>
                    <span className="sm:hidden">Edit Doctor</span>
                  </h3>
                  <p className="text-gray-700 font-medium text-sm lg:text-base">
                    <span className="hidden sm:inline">Update information for Dr. {editingDoctor.name}</span>
                    <span className="sm:hidden">Update Dr. {editingDoctor.name}</span>
                  </p>
                </div>
                
                {/* Form Fields */}
                <div className="space-y-4 lg:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                      placeholder="Enter doctor's full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                      placeholder="Enter doctor's email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      New Password
                    </label>
                    <p className="text-xs text-gray-600 mb-2">Leave blank to keep current password</p>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={editForm.password}
                        onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                        className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white/95 backdrop-blur-sm shadow-sm text-sm lg:text-base"
                        placeholder="Enter new password (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Eye className="w-4 h-4 lg:w-5 lg:h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6 lg:mt-8">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 text-gray-700 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm text-sm lg:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={updateLoading}
                    className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-rose-600 text-white rounded-lg hover:from-blue-700 hover:to-rose-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                  >
                    {updateLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-3 h-3 lg:w-4 lg:h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        <span className="hidden sm:inline">Updating...</span>
                        <span className="sm:hidden">...</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Update Doctor</span>
                        <span className="sm:hidden">Update</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}