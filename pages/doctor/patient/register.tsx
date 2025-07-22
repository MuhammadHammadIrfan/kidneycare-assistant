import { useState } from "react";
import { Menu } from "lucide-react"; // Hamburger icon
import DoctorSidebar from "../../../components/doctor/DoctorSidebar";
import PatientForm from "../../../components/doctor/PatientForm";
import TestInputTable from "../../../components/doctor/TestInputTable";
import { Button } from "../../../components/ui/button";
import { motion } from "framer-motion";
import { requireAuthServer } from "../../../lib/requireAuthServer";
import RecommendationTable from "../../../components/doctor/RecommendationTable";

export async function getServerSideProps(context: any) {
  return requireAuthServer(context, ["doctor"]);
}

export default function RegisterPatient({ user }: { user: any }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    nationalId: "",
    contactInfo: "",
  });
  const [testValues, setTestValues] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labReportId, setLabReportId] = useState<string | null>(null);
  const [situationId, setSituationId] = useState<number | null>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTestValues({ ...testValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/doctor/patient/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, testValues }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
    } else {
      setLabReportId(data.labReportId);
      setSituationId(data.situationId);
      setSuccess("Patient registered successfully!");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-white to-rose-100">
      {/* Sidebar */}
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
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
          className="text-2xl font-bold text-blue-900 mb-8"
        >
          Register New Patient
        </motion.h1>

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-8 bg-white/90 rounded-xl shadow-lg p-8 border border-blue-100"
        >
          <PatientForm form={form} onChange={handleFormChange} />
          <TestInputTable testValues={testValues} onChange={handleTestChange} />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <Button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 text-lg"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register & Generate Recommendations"}
          </Button>
        </form>

        {labReportId && situationId && (
          <RecommendationTable labReportId={labReportId} situationId={situationId} />
        )}
      </main>
    </div>
  );
}
