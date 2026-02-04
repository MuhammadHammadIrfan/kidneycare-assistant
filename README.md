# 🏥 KidneyCare Assistant

A clinical decision support system designed to assist nephrologists in managing patients with **Secondary Hyperparathyroidism (SHPT)** in Chronic Kidney Disease. The system provides intelligent medication recommendations based on lab results and clinical guidelines.

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Security](#-security)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

KidneyCare Assistant is a **full-stack healthcare application** that helps doctors:

- **Register and manage CKD patients** with detailed medical histories
- **Track laboratory results** (PTH, Calcium, Phosphorus, etc.) over time
- **Receive AI-powered medication recommendations** based on clinical decision trees
- **Visualize patient trends** with interactive charts
- **Manage follow-up visits** and treatment adjustments

The system implements a sophisticated **classification algorithm** that categorizes patients into clinical situations and recommends appropriate medications based on KDIGO guidelines.

---

## ✨ Features

### For Doctors
| Feature | Description |
|---------|-------------|
| 🔐 **Secure Authentication** | JWT-based authentication with HTTP-only cookies |
| 👤 **Patient Management** | Register, search, and manage patient records |
| 📊 **Lab Result Tracking** | Input and track PTH, Calcium, Phosphorus, and other markers |
| 💊 **Smart Recommendations** | Algorithm-driven medication suggestions based on lab values |
| 📈 **Trend Visualization** | Interactive charts showing patient progress over time |
| 📋 **Visit History** | Complete history of all patient visits and treatments |
| ✏️ **Edit Capabilities** | Modify test results with automatic situation reclassification |

### For Administrators
| Feature | Description |
|---------|-------------|
| 👨‍⚕️ **Doctor Management** | Register, activate/deactivate doctor accounts |
| 📊 **Dashboard Analytics** | View system-wide statistics and activity |
| 🔑 **Password Management** | Secure password reset capabilities |

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15 (Pages Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Charts:** Chart.js with react-chartjs-2
- **Icons:** Lucide React
- **Components:** shadcn/ui

### Backend
- **API Routes:** Next.js API Routes
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma (with Accelerate extension)
- **Authentication:** JWT (jsonwebtoken) with secure HTTP-only cookies
- **Password Hashing:** bcryptjs

### Infrastructure
- **Database Hosting:** Supabase
- **Deployment:** Vercel
- **Security:** Row Level Security (RLS) policies

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Doctor    │  │   Admin     │  │   Login                 │  │
│  │  Dashboard  │  │  Dashboard  │  │   Page                  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  JWT Authentication Middleware (requireDoctor/requireAdmin)│   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  /api/doctor│  │ /api/admin  │  │  /api/login & logout    │  │
│  │   routes    │  │   routes    │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Row Level Security (RLS) Policies                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌────────────────────┐   │
│  │  User   │ │ Patient │ │ LabReport │ │ RecommendationTree │   │
│  └─────────┘ └─────────┘ └───────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MuhammadHammadIrfan/kidneycare-assistant.git
   cd kidneycare-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and JWT secret.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_secure_random_string_min_32_characters
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side operations (bypasses RLS) |
| `JWT_SECRET` | Secret key for signing JWT tokens (keep this secure!) |

---

## 📁 Project Structure

```
kidneycare-assistant/
├── components/
│   ├── admin/                 # Admin-specific components
│   │   └── AdminSidebar.tsx
│   ├── doctor/                # Doctor-specific components
│   │   ├── DoctorSidebar.tsx
│   │   ├── MedicationRecommendation.tsx
│   │   ├── PatientForm.tsx
│   │   ├── PatientHistoryDisplay.tsx
│   │   ├── PatientReport.tsx
│   │   ├── PatientSearch.tsx
│   │   ├── RecommendationTable.tsx
│   │   ├── TestInputTable.tsx
│   │   └── TrendGraph.tsx
│   ├── ui/                    # Reusable UI components
│   └── RequireAuth.tsx        # Auth wrapper component
├── lib/
│   ├── auth.ts                # Client-side auth utilities
│   ├── authToken.ts           # JWT token management
│   ├── classify.ts            # Patient classification algorithm
│   ├── medicationMatcher.ts   # Medication matching logic
│   ├── supabaseAdmin.ts       # Server-side Supabase client
│   ├── supabaseClient.ts      # Client-side Supabase client
│   └── utils.ts               # Utility functions
├── pages/
│   ├── admin/                 # Admin pages
│   │   ├── dashboard.tsx
│   │   ├── doctors.tsx
│   │   └── register-doctor.tsx
│   ├── api/                   # API routes
│   │   ├── admin/             # Admin API endpoints
│   │   ├── doctor/            # Doctor API endpoints
│   │   ├── login.ts
│   │   └── logout.ts
│   ├── doctor/                # Doctor pages
│   │   ├── dashboard.tsx
│   │   ├── patient-history.tsx
│   │   └── patient/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   └── login.tsx
├── supabase/
│   └── migrations/            # Database migration scripts
├── styles/
│   └── globals.css
└── public/                    # Static assets
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user and set JWT cookie |
| POST | `/api/logout` | Clear authentication cookie |

### Doctor Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/patient/search` | Search patient by National ID |
| POST | `/api/doctor/patient/register` | Register new patient with lab results |
| GET | `/api/doctor/patient/patient-history` | Get complete patient history |
| PUT | `/api/doctor/patient/edit-test-results` | Update lab results |
| DELETE | `/api/doctor/patient/delete-visit` | Delete a patient visit |
| GET | `/api/doctor/patient/trends` | Get patient trend data |
| POST | `/api/doctor/patient/visit/followup` | Record follow-up visit |
| GET | `/api/doctor/dashboard/stats` | Get doctor's dashboard statistics |

### Admin Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard-stats` | Get admin dashboard statistics |
| GET/PUT | `/api/admin/doctors` | List or update doctors |
| POST | `/api/admin/register-doctor` | Register new doctor |
| PUT | `/api/admin/update-password` | Update user password |

---

## 🔒 Security

### Authentication Flow
1. User submits credentials via login form
2. Server validates against bcrypt-hashed password
3. JWT token created with user ID, email, and role
4. Token stored in HTTP-only, secure, SameSite cookie
5. Subsequent requests validated via `requireDoctor()` or `requireAdmin()` middleware

### Security Features
- ✅ **JWT Authentication** - Cryptographically signed tokens
- ✅ **HTTP-Only Cookies** - Prevents XSS token theft
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Role-Based Access** - Doctor/Admin authorization checks
- ✅ **Data Isolation** - Doctors can only access their own patients
- ✅ **Row Level Security** - Database-level access control (RLS policies)

---

## 🗄 Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| `User` | Doctor and admin accounts |
| `Patient` | Patient demographics and doctor assignment |
| `LabReport` | Lab visit records with situation classification |
| `TestResult` | Individual test values (PTH, Ca, Phos, etc.) |
| `MedicationPrescription` | Prescribed medications per visit |
| `AssignedRecommendation` | Treatment recommendations |

### Classification Tables
| Table | Description |
|-------|-------------|
| `Situation` | Clinical situation categories |
| `Bucket` | Classification buckets |
| `Group` | Situation groupings |
| `Question` / `Option` | Decision tree structure |
| `RecommendationTemplate` | Medication recommendation templates |
| `MedicationType` | Available medications |

---

## 🚢 Deployment

### Vercel Deployment

1. **Connect Repository**
   - Import your GitHub repository to Vercel

2. **Configure Environment Variables**
   - Add all variables from `.env.example` to Vercel project settings

3. **Deploy**
   - Vercel auto-deploys on push to main branch

### Database Setup

1. Create a Supabase project
2. Run the schema migrations from `supabase/migrations/`
3. Enable Row Level Security (optional but recommended)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Muhammad Hammad Irfan**

- GitHub: [@MuhammadHammadIrfan](https://github.com/MuhammadHammadIrfan)

---

<p align="center">
  Made with ❤️ for better kidney care
</p>
