# Medical Report Analyzer — Frontend Client

> A modern, responsive Single Page Application (SPA) for patients and clinicians to visualize medical reports, monitor clinical lab parameters, collaborate via real-time messaging, and review AI-grounded health summaries.

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.6-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.99.0-FF4154?style=flat&logo=react-query&logoColor=white)](https://tanstack.com/query/latest)

---

## 1. Overview & Visual Design Language

The frontend is built with **React 18** and **Vite**, styled using **Tailwind CSS**, and architected with a clean, clinical healthcare SaaS aesthetic. It features:
- **Clean Healthcare Visual Language**: Crisp cards with subtle slate/blue backgrounds, soft shadows, clear visual hierarchy, and high contrast typography.
- **Time-Contextual Greeting Banner**: Dynamic morning/afternoon/evening greetings personalized with the user's name, current date, and account status indicators.
- **Inspirational Healthcare Art**: Serene landscape vector cards paired with positive wellness affirmations (*“A healthier you is a brighter tomorrow.”*).
- **Responsive Navigation**: Full desktop sidebar/header alongside an accessible mobile slide-over hamburger drawer.
- **Role-Gated Routing**: Clean separation of views between Patients and Doctors via declarative `RoleRoute` wrappers.

---

## 2. Key Pages & Features

### 2.1 Patient Experience
- **Patient Dashboard (`PatientDashboard.jsx`)**:
  - Personalized time-contextual greeting header with active lab sync status indicator.
  - Inspirational artwork wellness card.
  - Quick action cards with soft pastel healthcare icon boxes: *Find Doctors*, *View Reports*, *Manage Medicines*, and *Update Profile*.
  - Key Health Metric stat cards displaying Total Reports, Monitored Analytes, Critical Alerts, and a calculated BMI status chip.
  - High-priority Abnormal Values Callout banner highlighting any out-of-range lab analytes with quick tags.
  - Recent Reports table with upload date, file type badge, OCR parsing status pills (`Completed`, `Processing`, `Pending`), and direct links to report analysis.
- **Report Viewer (`ReportViewer.jsx`)**:
  - Detailed breakdown of extracted clinical lab values (analyte, value, unit, reference range).
  - Visual status badges (`Within Range`, `Outside Range`, `Unknown`).
  - Hugging Face AI-grounded clinical report summary and findings.
- **Health Analytics (`HealthSummaryPage.jsx` & `CorrelationPage.jsx`)**:
  - Interactive Recharts trend charts tracking longitudinal biomarker changes over time.
  - Pearson correlation matrix heatmap discovering relationships between lab parameters.
- **Medicine Manager (`Medicines.jsx`)**:
  - Active and historical medication tracking with automated status shifts based on end dates.
- **Doctor Directory & Access Control (`FindDoctors.jsx`)**:
  - Search verified doctors by specialty/category.
  - Grant, request, or revoke consent-based medical record access with a single click.
  - Direct `[Message]` button launching real-time chat with authorized physicians.
- **Patient Profile (`PatientProfile.jsx`)**:
  - Manage personal health indicators (blood group, height, weight, allergies, BMI calculation).

### 2.2 Doctor Experience
- **Doctor Dashboard (`DoctorDashboard.jsx`)**:
  - Practice overview metrics (active patients, pending review requests, total consultations).
  - Urgent pending patient access requests with one-click *Accept* / *Reject* controls.
- **Patient Roster (`DoctorInterface.jsx`)**:
  - Patient-first roster showing only patients who have explicitly granted access.
  - Detailed patient inspection view: historical lab values, longitudinal trends, and medication lists.
  - Clinical Consultation Notes editor powered by **React Quill** with report context linkage.
- **Doctor Profile (`DoctorProfile.jsx`)**:
  - Edit qualifications, clinic address, phone, bio, and specialty taxonomy.
  - Granular patient visibility toggles (choose which profile fields patients can see).

### 2.3 Shared Features
- **Real-Time Messaging (`Chat.jsx`)**:
  - Bi-directional instant messaging via **Socket.IO**.
  - Active conversation drawer with latest message previews and unread badges.
  - Permanent conversation deletion modal with confirmation dialog.
- **Authentication (`Login.jsx` & `Register.jsx`)**:
  - Segmented Patient vs. Doctor tabs during registration and login.
  - Confirm password field with real-time mismatch alerts and color-coded validation.
  - Show/hide password visibility toggles with eye icons.
  - Role-mismatch prevention (blocking patients from doctor sign-in endpoints and vice versa).

---

## 3. Tech Stack & Key Libraries

| Package | Version | Purpose |
|:---|:---:|:---|
| `react` / `react-dom` | `^18.2.0` | Core UI library & DOM renderer |
| `vite` | `^5.0.8` | Next-generation bundler and lightning-fast HMR dev server |
| `react-router-dom` | `^6.20.0` | Declarative client-side routing & route guards |
| `@tanstack/react-query` | `^5.99.0` | Asynchronous server-state management, caching & background revalidation |
| `axios` | `^1.6.2` | HTTP client with automatic JWT token injection interceptors |
| `tailwindcss` | `^3.3.6` | Utility-first responsive CSS framework |
| `recharts` | `^3.8.1` | Composable charting library for biomarker trends and analytics |
| `lucide-react` | `^0.294.0` | Modern, consistent icon library |
| `socket.io-client` | `^4.8.3` | Real-time WebSocket connection for doctor-patient chat |
| `react-dropzone` | `^14.2.3` | Drag-and-drop file upload zone for medical reports |
| `react-quill` | `^2.0.0` | Rich text editor for clinical consultation notes |
| `date-fns` | `^2.30.0` | Lightweight date manipulation and formatting |

---

## 4. Directory Structure

```
frontend/
├── public/
│   ├── _redirects              # Netlify SPA redirect rules (/* /index.html 200)
│   └── vite.svg
├── src/
│   ├── analytics/              # Analytics calculation utilities (Pearson correlation, stats)
│   ├── components/
│   │   ├── EnhancedCards.jsx   # Styled stat & metric cards
│   │   ├── ErrorBoundary.jsx   # Top-level React error boundary
│   │   ├── FormComponents.jsx  # Reusable inputs, selects, and buttons
│   │   ├── InsightsPanel.jsx   # AI insights & key observations card
│   │   ├── Layout.jsx          # App shell, top header, desktop & mobile sidebar
│   │   ├── ParameterCard.jsx   # Lab value indicator card with range badges
│   │   ├── PatientAiChat.jsx   # Patient conversational AI assistant component
│   │   ├── RiskBadge.jsx       # Clinical risk & reference range badge
│   │   ├── RoleRoute.jsx       # Route guard enforcing 'patient' or 'doctor' role
│   │   ├── Skeletons.jsx       # Loading skeletons for dashboards and lists
│   │   ├── Toast.jsx           # Global feedback notifications
│   │   └── TrendChart.jsx      # Recharts parameter trendline wrapper
│   ├── contexts/
│   │   └── AuthContext.jsx     # User session, JWT persistence, login/logout state
│   ├── pages/
│   │   ├── Chat.jsx            # Direct doctor-patient messaging view
│   │   ├── CorrelationPage.jsx # Pearson correlation matrix analysis
│   │   ├── DoctorDashboard.jsx # Doctor practice overview & access requests
│   │   ├── DoctorInterface.jsx # Doctor patient roster, patient details & notes
│   │   ├── DoctorProfile.jsx   # Doctor credentials and visibility toggles
│   │   ├── FindDoctors.jsx     # Doctor search & access request management
│   │   ├── HealthSummaryPage.jsx # Aggregated health metrics and lab totals
│   │   ├── Login.jsx           # Role-segmented sign-in with password toggle
│   │   ├── MedicalDashboard.jsx# Medical report analytics & overview
│   │   ├── Medicines.jsx       # Patient active & historical medication tracker
│   │   ├── PatientDashboard.jsx# Modern healthcare SaaS patient overview
│   │   ├── PatientProfile.jsx  # Patient health profile (blood, height, weight, BMI)
│   │   ├── Register.jsx        # Role-segmented registration with confirm password
│   │   ├── Reports.jsx         # Upload reports and view historical report list
│   │   └── ReportViewer.jsx    # Detailed lab values, status badges & AI summary
│   ├── services/
│   │   ├── api.js              # Axios instance with request/response interceptors
│   │   └── socket.js           # Socket.IO client initialization
│   ├── utils/                  # Helper formatters (dates, numbers, status mappers)
│   ├── App.jsx                 # Route definitions and QueryClientProvider setup
│   ├── index.css               # Tailwind CSS directives & base typography
│   └── main.jsx                # React root mount
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 5. Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# URL of your running backend server (Render API or local development)
VITE_API_BASE_URL=http://localhost:8000
```

> [!WARNING]
> Never put backend secrets, database connection strings, or Hugging Face API tokens in `frontend/.env`. All `VITE_*` variables are exposed to the client bundle.

---

## 6. Scripts & Development

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (default port: 5173)
npm run dev

# Run production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Run ESLint validation
npm run lint
```

---

## 7. Client-Side Routing & Access Matrix

| Path | Component | Protected? | Role Restriction | Purpose |
|:---|:---|:---:|:---:|:---|
| `/login` | `Login.jsx` | No | Public (Redirects if logged in) | User authentication |
| `/register` | `Register.jsx` | No | Public (Redirects if logged in) | User registration |
| `/dashboard` | `PatientDashboard` or `DoctorDashboard` | Yes | Dynamic | Role-specific main overview |
| `/reports` | `Reports.jsx` | Yes | All Authenticated | Upload & list medical reports |
| `/reports/:id` | `ReportViewer.jsx` | Yes | All Authenticated | Detailed lab analytes & AI summary |
| `/chat` | `Chat.jsx` | Yes | All Authenticated | Direct Socket.IO messaging |
| `/find-doctors` | `FindDoctors.jsx` | Yes | Patient Only | Search doctors & manage access |
| `/medicines` | `Medicines.jsx` | Yes | Patient Only | Medication tracker |
| `/profile` | `PatientProfile.jsx` | Yes | Patient Only | Patient health vitals & BMI |
| `/doctor/patients` | `DoctorInterface.jsx` | Yes | Doctor Only | Authorized patient roster |
| `/doctor/patient/:id`| `DoctorInterface.jsx` | Yes | Doctor Only | Clinical patient record & notes |
| `/doctor/profile` | `DoctorProfile.jsx` | Yes | Doctor Only | Professional credentials & settings |
| `/analytics/health-summary` | `HealthSummaryPage.jsx` | Yes | All Authenticated | Aggregate biomarker status |
| `/analytics/correlation` | `CorrelationPage.jsx` | Yes | All Authenticated | Lab value correlation analysis |

