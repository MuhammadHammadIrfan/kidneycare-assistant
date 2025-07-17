import Link from "next/link";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";

const features = [
  {
    title: "Patient Registration",
    desc: "Quickly register new CKD-MBD patients and manage their profiles.",
    icon: "👤",
  },
  {
    title: "Lab Test Tracking",
    desc: "Track PTH, calcium, phosphate, albumin, and imaging results over time.",
    icon: "🧪",
  },
  {
    title: "Group & Situation Classification",
    desc: "Automatic, expert-based classification into clinical groups and situations.",
    icon: "📊",
  },
  {
    title: "Treatment Recommendations",
    desc: "Rule-based, guideline-driven suggestions tailored to each patient.",
    icon: "💊",
  },
  {
    title: "History & Follow-ups",
    desc: "View longitudinal lab history and all past recommendations for auditing.",
    icon: "📈",
  },
];

const values = [
  {
    title: "Faster Decisions",
    desc: "Reduce time-to-treatment with instant, guideline-based recommendations.",
    icon: "⚡",
  },
  {
    title: "Safer Care",
    desc: "Minimize errors and ensure every patient receives evidence-based advice.",
    icon: "🛡️",
  },
  {
    title: "Longitudinal Records",
    desc: "Track every visit, test, and decision for robust clinical documentation.",
    icon: "🗂️",
  },
];

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-rose-50 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-rose-700 tracking-tight">KidneyCare Assistant</span>
          </div>
          <ul className="hidden md:flex items-center gap-8 text-gray-700 font-medium">
            <li>
              <a href="#features" className="hover:text-rose-700 transition">Features</a>
            </li>
            <li>
              <a href="#value" className="hover:text-rose-700 transition">Why Us</a>
            </li>
            <li>
              <a href="#about" className="hover:text-rose-700 transition">About</a>
            </li>
            <li>
              <a href="#contact" className="hover:text-rose-700 transition">Contact</a>
            </li>
            <li>
              <Link href="/login">
                <Button className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg shadow">
                  Login
                </Button>
              </Link>
            </li>
          </ul>
          {/* Mobile menu button (optional) */}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 px-6 py-16 md:py-24">
        {/* Left: Text */}
        <div className="flex-1">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-6 leading-tight"
          >
            Clinical Decision Support for CKD-MBD
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-lg md:text-xl text-gray-700 mb-8"
          >
            Empowering nephrologists with expert-driven, rule-based recommendations for managing Chronic Kidney Disease – Mineral and Bone Disorder (CKD-MBD) patients.
          </motion.p>
          <Link href="/login">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 text-lg rounded-lg shadow">
              Doctor/Admin Login
            </Button>
          </Link>
        </div>
        {/* Right: Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex-1 flex justify-center"
        >
          <img
            src="/image.png"
            alt="Medical illustration"
            className="w-[340px] h-[340px] object-contain drop-shadow-lg"
          />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-blue-900 mb-10 text-center">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow hover:shadow-lg transition"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold text-blue-800 mb-2">{f.title}</h3>
                <p className="text-gray-700">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Section */}
      <section id="value" className="bg-gradient-to-r from-rose-50 via-white to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-blue-900 mb-10 text-center">Why Hospitals Use KidneyCare Assistant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white border border-gray-100 rounded-xl p-6 shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-lg font-semibold text-blue-800 mb-1">{v.title}</h3>
                <p className="text-gray-700">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Attribution Section */}
      <section
        id="about"
        className="bg-gray-50 border-t border-b border-gray-200 py-10"
      >
        <div className="max-w-3xl mx-auto px-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Project Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600 text-sm">
            <div>
              <span className="font-medium">Principal Investigator:</span>
              <div className="ml-4">Prof. Sungyoung Lee (Kyung Hee University)</div>
            </div>
            <div>
              <span className="font-medium">Domain Experts:</span>
              <div className="ml-4">
                Dr. Professor Sang-Ho Lee (Kyung Hee University Hospital)<br />
                Dr. Su Woong Jung (Kyung Hee University Hospital)
              </div>
            </div>
            <div>
              <span className="font-medium">Knowledge Engineering Team:</span>
              <div className="ml-4">
                Syed Imran Ali<br />
                Bilal Ali
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="bg-white border-t border-gray-200 py-6 mt-auto"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <div>
            &copy; {new Date().getFullYear()} KidneyCare Assistant. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a href="mailto:info@kidneycare-assistant.com" className="hover:text-rose-700">info@kidneycare-assistant.com</a>
            <a href="#" className="hover:text-rose-700">Privacy</a>
            <a href="#" className="hover:text-rose-700">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
} 