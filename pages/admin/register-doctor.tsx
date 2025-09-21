import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, UserPlus, User, Mail, Phone, Lock, Stethoscope, CheckCircle } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { Button } from "../../components/ui/button";
import { requireAuthServer } from "../../lib/requireAuthServer";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["admin"]);
}

export default function RegisterDoctor({ user }: { user: any }) {
  // FIXED: Add proper sidebar state management
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    specialization: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/register-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          specialization: formData.specialization,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Doctor registered successfully!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          specialization: "",
        });
      } else {
        throw new Error(data.error || "Registration failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar - FIXED: Add sidebar like other pages */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content - FIXED: Dynamic margin and prevent horizontal scroll */}
      <div className={`transition-all duration-300 min-h-screen ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } overflow-x-hidden`}>
        <div className="p-3 lg:p-6 xl:p-10">
          {/* Mobile/Desktop Menu Button - FIXED: Add menu button */}
          <div className="mb-4">
            <button
              className="p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
              onClick={toggleSidebar}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xl lg:text-2xl xl:text-3xl font-bold text-rose-900 mb-4 lg:mb-8 flex items-center"
          >
            <UserPlus className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3 flex-shrink-0" />
            <span className="hidden sm:inline">Register New Doctor</span>
            <span className="sm:hidden">Register Doctor</span>
          </motion.h1>

          {error && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm lg:text-base">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
              <p className="text-green-700 text-sm lg:text-base">{success}</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white/90 rounded-xl shadow-lg p-4 lg:p-8 border border-rose-100">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-semibold text-rose-800 mb-2">Doctor Information</h2>
                <p className="text-sm lg:text-base text-gray-600">
                  <span className="hidden sm:inline">Fill in the details below to register a new doctor in the system.</span>
                  <span className="sm:inline lg:hidden">Fill in doctor details to register.</span>
                  <span className="hidden lg:inline">Fill in the details below to register a new doctor in the system.</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 lg:w-5 lg:h-5 inline mr-2" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 lg:p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Enter doctor's full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 lg:w-5 lg:h-5 inline mr-2" />
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 lg:p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Password */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 lg:w-5 lg:h-5 inline mr-2" />
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full p-2 lg:p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Enter password (min 6 chars)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 lg:w-5 lg:h-5 inline mr-2" />
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full p-2 lg:p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={() => window.history.back()}
                    className="w-full lg:w-auto px-6 border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 text-sm lg:text-base"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full lg:flex-1 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-gray-400 text-sm lg:text-base"
                  >
                    {loading ? "Registering..." : "Register Doctor"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}