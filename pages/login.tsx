import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { setCurrentUser } from "../lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
      credentials: 'include', // Important: include cookies in request
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
    } else {
      // Save user info for UI display (auth is handled by HTTP-only cookie)
      setCurrentUser({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      });
      
      // Redirect based on user role
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.role === "doctor") {
        router.push("/doctor/dashboard");
      } else {
        setError("Unknown user role");
      }
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-rose-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 lg:p-8 w-full max-w-md"
      >
        <div className="text-left mb-2">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-rose-600 hover:text-rose-700 hover:-translate-y-0.5 transition-all duration-200 font-medium"
          >
            ← Back to Home
          </button>
        </div>

        <h2 className="text-xl lg:text-2xl font-bold text-rose-700 mb-6 text-center">
          Login to KidneyCare Assistant
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium text-sm lg:text-base">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="doctor@hospital.com"
              className="w-full placeholder:text-gray-500 text-gray-800 h-10 lg:h-12 text-sm lg:text-base"
              style={{ fontWeight: 500 }}
            />
          </div>

          {/* Password Field with Toggle */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium text-sm lg:text-base">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full placeholder:text-gray-500 text-gray-800 h-10 lg:h-12 text-sm lg:text-base pr-12"
                style={{ fontWeight: 500 }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 rounded p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium text-sm lg:text-base">
              Role
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="block w-full border border-gray-300 rounded-md px-3 py-2 lg:py-3 text-gray-800 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition text-sm lg:text-base"
              >
                <option value="" disabled>
                  Select role
                </option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3"
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-base lg:text-lg font-semibold rounded-lg h-10 lg:h-12 transition-all duration-200 transform hover:scale-[1.02] focus:ring-4 focus:ring-rose-500 focus:ring-opacity-50"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}