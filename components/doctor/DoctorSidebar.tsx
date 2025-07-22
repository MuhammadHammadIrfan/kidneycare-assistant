import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, History, BarChart2, LogOut, UserSearch, X } from "lucide-react";
import Cookies from "js-cookie";

const navLinks = [
  { href: "/doctor/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5 mr-2" /> },
  { href: "/doctor/patient/register", label: "Register Patient", icon: <UserPlus className="w-5 h-5 mr-2" /> },
  { href: "/doctor/patient/followup", label: "Follow-up Visit", icon: <UserSearch className="w-5 h-5 mr-2" /> },
  { href: "/doctor/recommendations", label: "Recommendations", icon: <History className="w-5 h-5 mr-2" /> },
  { href: "/doctor/stats", label: "Lab/Test Trends", icon: <BarChart2 className="w-5 h-5 mr-2" /> },
];

export default function DoctorSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();

  const handleSignOut = () => {
    Cookies.remove("kc_user");
    localStorage.removeItem("kc_user");
    sessionStorage.clear();
    router.push("/");
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-100 via-rose-50 to-rose-200 border-r border-blue-100 py-8 px-4 flex flex-col gap-8 shadow-lg z-50 transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Close button for mobile */}
        <button
          className="absolute top-4 right-4 text-gray-700 lg:hidden"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-blue-800 tracking-tight">Doctor Panel</h2>
        </motion.div>

        <nav className="flex flex-col gap-2 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition
                ${
                  router.pathname === link.href
                    ? "bg-gradient-to-r from-blue-200 to-rose-100 text-blue-900 shadow"
                    : "text-blue-900 hover:bg-blue-50"
                }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          className="mt-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base shadow transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </aside>
    </>
  );
}
