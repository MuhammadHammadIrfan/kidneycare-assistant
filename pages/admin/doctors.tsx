// pages/admin/doctors.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Edit, Trash2, Users, Activity, FileText, Plus, Eye, EyeOff, X } from "lucide-react";
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
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <AdminSidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Doctors Management</h1>
            <p className="text-gray-800 font-medium">Manage doctor accounts and view their activity</p>
          </motion.div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search doctors by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 font-medium"
                />
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-blue-50 rounded-lg p-4 border border-blue-200"
            >
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{doctors.length}</div>
                  <div className="text-sm text-gray-800 font-semibold">Total Doctors</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200"
            >
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {doctors.filter(d => d.stats.isActive).length}
                  </div>
                  <div className="text-sm text-gray-800 font-semibold">Active Doctors</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Doctors List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200"
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Doctors</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {doctors.filter(d => d.active).length} active and {doctors.filter(d => !d.active).length} deactivated doctors
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => {
                        console.log('[TOGGLE] Changed to:', e.target.checked);
                        setShowInactive(e.target.checked);
                      }}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className={showInactive ? 'text-blue-600 font-semibold' : 'text-gray-700'}>
                      Show Deactivated Doctors
                    </span>
                  </label>
                </div>
                {showInactive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Including Deactivated
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm 
                    ? 'No doctors found matching your search.' 
                    : showInactive 
                      ? 'No doctors found (including deactivated).' 
                      : 'No active doctors found.'
                  }
                </p>
                {showInactive && (
                  <p className="text-xs text-gray-400 mt-2">
                    Toggle off "Show Deactivated Doctors" to see only active doctors
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs text-gray-600">
                    Displaying {filteredDoctors.length} doctor(s) 
                    {showInactive ? ' (including deactivated)' : ' (active only)'}
                    {searchTerm && ` matching "${searchTerm}"`}
                  </p>
                </div>
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
            )}
          </motion.div>

          {/* Enhanced Edit Modal */}
          {showEditModal && editingDoctor && (
            <div className="fixed inset-0 bg-blue-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-gradient-to-br from-white via-blue-50 to-rose-50 rounded-xl shadow-2xl border border-blue-200 p-8 w-full max-w-lg mx-4 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowEditModal(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Modal Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">
                    Edit Doctor Profile
                  </h3>
                  <p className="text-gray-700 font-medium">
                    Update information for Dr. {editingDoctor.name}
                  </p>
                </div>
                
                {/* Form Fields */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white shadow-sm"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white shadow-sm"
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
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500 bg-white shadow-sm"
                        placeholder="Enter new password (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={updateLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-rose-600 text-white rounded-lg hover:from-blue-700 hover:to-rose-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Updating...
                      </div>
                    ) : (
                      'Update Doctor'
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