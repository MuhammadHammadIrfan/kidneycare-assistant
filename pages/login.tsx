import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion } from "framer-motion";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
    } else {
      Cookies.set("kc_user", JSON.stringify(data), { expires: 1 }); // 1 day expiry
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-rose-50">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-white/90 rounded-xl shadow-lg p-8 w-full max-w-md"
      >
        <div className="text-left mb-2">
            <button
                onClick={() => router.push("/")}
                className="text-sm text-rose-600 hover:-translate-y-0.5 transition-transform duration-200"
            >
                ← Back to Home
            </button>
        </div>

        <h2 className="text-2xl font-bold text-rose-700 mb-6 text-center">
          Login to KidneyCare Assistant
        </h2>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="doctor@hospital.com"
              className="w-full placeholder:text-gray-500 text-gray-800"
              style={{ fontWeight: 500 }}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full placeholder:text-gray-500 text-gray-800"
              style={{ fontWeight: 500 }}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                required
                className="block w-48 border border-gray-300 rounded-md px-3 py-2 text-gray-800 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              >
                <option value="" disabled>
                  Select role
                </option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-lg font-semibold rounded-lg h-12"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 