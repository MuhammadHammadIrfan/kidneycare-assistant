import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, LogOut } from "lucide-react";

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
];

export default function AdminSidebar() {
  const router = useRouter();

  const handleSignOut = () => {
    // Clear any local/session storage if used for user info
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    router.push("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-blue-100 via-rose-50 to-rose-200 border-r border-blue-100 py-8 px-4 flex flex-col gap-8 shadow-lg">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-rose-700 tracking-tight">Admin Panel</h2>
      </motion.div>
      <nav className="flex flex-col gap-2 flex-1">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition
              ${
                router.pathname === link.href
                  ? "bg-gradient-to-r from-rose-200 to-blue-100 text-rose-700 shadow"
                  : "text-blue-900 hover:bg-blue-50"
              }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="mt-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base shadow transition"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </aside>
  );
} 