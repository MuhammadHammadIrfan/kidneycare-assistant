// components/admin/AdminSidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, LogOut, Users } from "lucide-react";
import Cookies from "js-cookie";

const navLinks = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5 mr-2" />,
  },
  {
    href: "/admin/register-doctor",
    label: "Register Doctor",
    icon: <UserPlus className="w-5 h-5 mr-2" />,
  },
  {
    href: "/admin/doctors",
    label: "Manage Doctors",
    icon: <Users className="w-5 h-5 mr-2" />,
  },
];

export default function AdminSidebar() {
  const router = useRouter();

  const handleSignOut = () => {
    Cookies.remove("kc_user");
    localStorage.removeItem("kc_user");
    sessionStorage.clear();
    router.push("/");
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-100 via-rose-50 to-rose-200 border-r border-blue-100 shadow-lg z-50 flex flex-col">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 border-b border-blue-200"
      >
        <h2 className="text-2xl font-bold text-rose-700 tracking-tight">
          Admin Panel
        </h2>
      </motion.div>

      {/* Navigation Section - Scrollable if needed */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200
                ${
                  router.pathname === link.href
                    ? "bg-gradient-to-r from-rose-200 to-blue-100 text-rose-700 shadow-md"
                    : "text-blue-900 hover:bg-blue-50 hover:shadow-sm"
                }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Sign Out Button - Always at Bottom */}
      <div className="p-4 border-t border-blue-200 bg-gradient-to-r from-rose-100 to-blue-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}