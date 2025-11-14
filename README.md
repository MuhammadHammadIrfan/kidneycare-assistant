KidneyCare Assistant

(Clinical Decision Support System for Nephrologists)

KidneyCare Assistant is a clinician-focused decision support platform designed in collaboration with a hospital nephrology department. It helps doctors manage patient visits, track lab results, analyze trends, and generate treatment recommendations based on predefined clinical rules.

This system improves workflow efficiency, ensures up-to-date patient monitoring, and centralizes all visit and lab report information in one interface.

🚀 Features

✔ Patient Management

Register new patients with complete demographic details.

Search and filter existing patients.

View full patient history including all previous visits and lab reports.

✔ Lab Reports & Test Results

Add new lab test results with file upload support.

Automatic test validity calculation based on test type (e.g., PTH = 3 months, Echo = 12 months).

Trend graphs for Calcium, Phosphate, PTH, Albumin, eGFR, and other lab markers.

Edit or delete test results or full reports with audit tracking.

✔ Clinical Recommendations

Recommendations generated from hospital-defined business logic.

Logic checks test ranges, interactions, and clinical rules.

Medication suggestions based on historical prescriptions of similar patients.

Doctor can review, edit, or override recommendations before saving.

✔ Visit Management

Follow-up visit form automatically fetches latest valid test results.

System warns if a test is outdated and needs rechecking.

Saves all visits chronologically.

✔ Security & Access Control

Role-based access: Admin & Doctor.

Encrypted authentication tokens.

Secure audit logs for edits, deletions, and updates.

✔ UI / UX

Clean dashboard with animated stats.

Sidebar with expand/collapse toggle and responsive mobile behavior.

Light, fast, and optimized user interface.

📁 Report Generator

Generates PDF visit Reports for patients.

🧱 Tech Stack

Next.js (Pages Router) – Frontend + Backend APIs

Supabase – Database, Auth, Admin SDK

PostgreSQL – Relational Database

Tailwind CSS – UI styling

Framer Motion – UI animations

Lucide Icons – UI icons

📦 Project Structure
/components       → Shared UI Components  
/pages/api        → Backend API routes  
/pages/doctor     → Doctor dashboard, registration, follow-up  
/pages/admin      → Admin dashboard  
/supabase         → Database config & service role  

🔐 Environment Variables

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_url

NEXT_PUBLIC_SUPABASE_KEY=anon_key

SUPABASE_SERVICE_ROLE_KEY=service_role_key

JWT_SECRET=your_secret

📌 Future Enhancements

These are planned features not yet implemented:

🔮 AI-Powered Enhancements

LLM-based Recommendation Assistant
Draft personalized explanations for clinical recommendations.

RAG (Retrieval-Augmented Generation)
Use hospital protocols + patient data for contextual recommendations.

AI-assisted Query Chatbot
Let doctors ask: “Show calcium trend for last 6 months” or
“Suggest dose adjustment for hyperphosphatemia.”

📊 Advanced Analytics

Automated risk categorization (CKD Stage, MBD risk, anemia flagging).

Predictive modeling for test deterioration.


🛠 Running Locally
npm install
npm run dev


Open:

http://localhost:3000

🧪 Building for Production
npm run build
npm start

📜 License

This project is private and hospital-specific.
Not open for public contributions.
