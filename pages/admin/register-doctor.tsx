import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { motion } from "framer-motion";
import { requireAuthServer } from '../../lib/requireAuthServer';

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["admin"]);
}

export default function RegisterDoctor() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/register-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setSuccess("Doctor registered successfully!");
        setName(""); 
        setEmail(""); 
        setPassword("");
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

    return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-white to-rose-100">
      <AdminSidebar />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="p-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-blue-900 mb-8"
          >
            Register New Doctor
          </motion.h1>
          <form onSubmit={handleRegister} className="max-w-md space-y-6 bg-gradient-to-br from-white via-blue-50 to-rose-100 rounded-xl shadow-lg p-8 border border-blue-100">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="text-black placeholder:text-gray-500"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 text-lg" disabled={loading}>
              {loading ? "Registering..." : "Register Doctor"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}