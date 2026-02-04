import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, History, BarChart2, LogOut, UserSearch, X } from "lucide-react";
import { signOut } from "../../lib/auth";
import { useEffect } from "react";

const navLinks = [
  { href: "/doctor/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> },
  { href: "/doctor/patient/register", label: "Register Patient", icon: <UserPlus className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> },
  { href: "/doctor/patient/followup", label: "Follow-up Visit", icon: <UserSearch className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> },
  { href: "/doctor/patient-history", label: "Patient History", icon: <History className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> },
  { href: "/doctor/stats", label: "Lab/Test Trends", icon: <BarChart2 className="w-4 h-4 lg:w-5 lg:h-5 mr-2" /> },
];

export default function DoctorSidebar({ 
  isOpen, 
  onClose 
}: { 
  isOpen?: boolean; 
  onClose?: () => void; 
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // FIXED: Prevent body scroll ONLY on mobile when sidebar is open
  useEffect(() => {
    // Only apply scroll prevention on mobile screens
    const isMobile = window.innerWidth < 1024;
    
    if (isOpen && isMobile) {
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Always allow scrolling on desktop or when sidebar is closed
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position on mobile
      if (scrollY && window.innerWidth < 1024) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    const handleRouteChange = () => {
      if (onClose && window.innerWidth < 1024) {
        onClose();
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, onClose]);

  return (
    <>
      {/* Mobile Overlay - ONLY shown on mobile screens */}
      {isOpen && onClose && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-rose-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - FIXED: Prevent horizontal scroll */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ 
          x: typeof window !== 'undefined' && window.innerWidth >= 1024 
            ? (isOpen === false ? -280 : 0) // Desktop: show by default, hide only if explicitly closed
            : (isOpen === true ? 0 : -280)  // Mobile: hide by default, show only if explicitly opened
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-50 via-rose-25 to-rose-100 border-r-2 border-blue-200/50 shadow-2xl z-50 lg:w-64
          flex flex-col overflow-y-auto`}
        style={{
          background: 'linear-gradient(180deg, rgb(239 246 255) 0%, rgb(254 242 242) 50%, rgb(254 226 226) 100%)',
          // FIXED: Ensure sidebar doesn't cause horizontal scroll
          maxWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '16rem' : '18rem'
        }}
      >
        {/* Header Section */}
        <div className="relative flex-shrink-0 px-4 lg:px-6 py-4 lg:py-6 border-b border-blue-200/30">
          {/* Close button - Always visible now */}
          <button
            className="absolute top-2 right-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-full transition-all"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-lg lg:text-2xl font-bold text-blue-800 tracking-tight pr-8">
              Doctor Panel
            </h2>
            <p className="text-xs lg:text-sm text-blue-600 mt-1 opacity-80">
              Medical Dashboard
            </p>
          </motion.div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 lg:px-4 py-3 lg:py-6 space-y-1 lg:space-y-2 min-h-0">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
            >
              <Link
                href={link.href}
                className={`flex items-center px-2 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl font-medium transition-all duration-200 group text-sm lg:text-base
                  ${
                    router.pathname === link.href
                      ? "bg-gradient-to-r from-blue-200/80 to-rose-200/80 text-blue-900 shadow-lg border border-blue-300/50"
                      : "text-blue-800 hover:bg-gradient-to-r hover:from-blue-100/60 hover:to-rose-100/60 hover:shadow-md hover:border hover:border-blue-200/30"
                  }`}
              >
                <span className={`transition-transform duration-200 ${
                  router.pathname === link.href ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  {link.icon}
                </span>
                <span className="font-semibold truncate">
                  {link.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Sign Out Button - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 lg:p-4 border-t border-blue-200/30 bg-gradient-to-r from-blue-50/50 to-rose-50/50">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-sm lg:text-base shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}