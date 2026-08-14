# Medical Report Analyzer (Express & MongoDB Implementation)

> A comprehensive full-stack web application for patients to upload medical reports, and doctors to analyze patient health data with AI-powered insights, real-time analytics, and centralized logging.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features by Role](#2-features-by-role)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Folder Structure](#5-folder-structure)
6. [Database Design (MongoDB & Mongoose)](#6-database-design-mongodb--mongoose)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Backend API Documentation](#8-backend-api-documentation)
9. [Report Upload & Processing Flow](#9-report-upload--processing-flow)
10. [Medicine Management](#10-medicine-management)
11. [Doctor-Patient Access System](#11-doctor-patient-access-system)
12. [Analytics & SVG Generation Module](#12-analytics--svg-generation-module)
13. [AI/ML Summary Module](#13-aiml-summary-module)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Backend Architecture & Central Logging System](#15-backend-architecture--central-logging-system)
16. [Setup Instructions](#16-setup-instructions)
17. [Sample Credentials & Dummy Data](#17-sample-credentials--dummy-data)
18. [Application Usage & User Flows](#18-application-usage--user-flows)
19. [Interview Preparation Guide](#19-interview-preparation-guide)
20. [Interview Questions & Answers (Node.js & MongoDB)](#20-interview-questions--answers-nodejs--mongodb)
21. [Current Limitations & Future Enhancements](#21-current-limitations--future-enhancements)

---

## 1. Project Overview

### Problem Statement
Medical professionals and patients struggle to:
- Organize and analyze fragmented medical reports from multiple providers.
- Extract structured, actionable insights from unstructured medical documents.
- Track health trends over time without manual data entry.
- Enable secure doctor-patient collaboration with proper consent and access control.
- Highlight abnormal values and potential health risks.

### Solution Overview
The **Medical Report Analyzer** automates the entire workflow:
1. **Patients** upload medical reports (PDF/images) → Automated OCR and text parsing extract key parameters.
2. **AI Processing** generates clinical summaries and structures lab data → Abnormalities detected and flagged.
3. **Data Storage** organizes results in a secure MongoDB database.
4. **Analytics** generates trends, Pearson correlations, and health insights.
5. **Doctor Collaboration** allows doctors to view approved patient data with role-based access control.

---

## 2. Features by Role

### 2.1 Patient Features
- **Registration & Login**: JWT-based authentication with secure password hashing.
- **Dashboard**: Overview of uploaded reports and health metrics.
- **Report Upload**: PDF/image upload with background text extraction.
- **Report Viewer**: Detailed report metrics, abnormal badges, and AI-generated summaries.
- **Profile Management**: Personal health metrics (age, gender, height, weight, BMI, allergies).
- **Medicine Tracking**: List current/past medications and update them.
- **Health Analytics**: Time-series trend lines, Pearson correlation matrix, and health scores.
- **Find Doctors**: Search and request access from doctors by specialty.

### 2.2 Doctor Features
- **Registration & Login**: JWT authentication with selected specialty taxonomy.
- **Dashboard & Patient List**: Patient-first workflow displaying only patients who have granted active consent.
- **Patient Analytics View**: Read-only access to a patient's reports, extracted lab values, medication history, and analytics.
- **Clinical Notes**: Add notes for patient consultations with a rich-text editor (Quill).
- **Doctor Profile**: Manage degrees, experience, and clinic details with customizable visibility fields.

### 2.3 Platform Security & Access Control
- **Role-Based Access Control (RBAC)**: Complete frontend (`RoleRoute`) and backend token authentication blockages for unauthorized resources.
- **Consent Workflow**: Explicit patient-initiated doctor access request, doctor approval, and instantaneous revocation control.
- **Data Isolation**: Doctors are restricted from downloading or uploading files.

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 18.2.0 | UI component library |
| | React Router DOM | 6.20.0 | Client-side routing |
| | TanStack React Query | 5.99.0 | Server state synchronization & caching |
| | Axios | 1.6.2 | HTTP client with automatic logging interceptors |
| | Recharts | 3.8.1 | Interactive charts/graphs |
| | Tailwind CSS | 3.3.6 | Utility-first CSS styling |
| **Backend** | Node.js | ^20.x | JavaScript runtime environment |
| | Express.js | 4.19.2 | Web API framework |
| | Winston Logger | 3.19.0 | Centralized, structured JSON logging |
| | Multer | 1.4.5 | Multipart file upload handling |
| | jsonwebtoken, bcryptjs | 9.0.2 / 2.4.3 | Authentication & password encryption |
| **Database** | MongoDB | Atlas/Local | Document database |
| | Mongoose | 8.2.0 | Object Document Mapper (ODM) |
| **OCR & Processing** | Tesseract.js | 7.0.0 | JS-native image text extractor |
| | pdf-parse | 2.4.5 | JS-native PDF text extractor |
| **AI Summarization** | OpenRouter API | - | LLM-based intelligent reports summarizer |

---

## 4. System Architecture

### 4.1 High-Level Architecture Diagram
```
  ┌──────────────────────────────────────────────────────────┐
  │                      Vite + React SPA                    │
  │   - Centralized Logger  - Error Boundary  - Axios Client │
  └──────────────────────────┬───────────────────────────────┘
                             │
                      HTTP / REST (JSON)
                    x-request-id + Bearer JWT
                             │
                             ▼
  ┌──────────────────────────────────────────────────────────┐
  │                    Express.js Backend                    │
  │   - requestLogger  - authMiddleware  - AppError Mapping  │
  └──────────┬──────────────────────────────────────┬────────┘
             │                                      │
       DB Operations                           Async Calls
             │                                      │
             ▼                                      ▼
  ┌──────────────────────┐               ┌──────────────────────┐
  │   MongoDB Database   │               │   OpenRouter AI API  │
  │  - Mongoose Schemas  │               │   - LLM Summaries    │
  └──────────────────────┘               └──────────────────────┘
```

### 4.2 Logging & Correlation Flow
```
Client Action ──► Axios Interceptor ──► Assigns x-request-id
                     │
                     ▼
Express Server ──► requestLogger ──► Instantiates AsyncLocalStorage
                     │
                     ├─► Service Layer (Logs carry requestId automatically)
                     ├─► Database Layer (Logs carry requestId automatically)
                     ▼
Response ◄──────── Returns x-request-id (Correlates client/server diagnostics)
```

---

## 5. Folder Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & Database connections
│   │   ├── controllers/     # Route controller endpoints logic
│   │   ├── errors/          # Custom AppErrors (BadRequest, Unauthorized, etc.)
│   │   ├── middleware/      # Auth, Zod Validation, requestLogger, errorHandler
│   │   ├── models/          # Mongoose Schemas (User, Report, LabValue, etc.)
│   │   ├── routes/          # Express route registration mappings
│   │   ├── services/        # Business logic services layer
│   │   └── utils/           # Winston logger, PDF parser, chart SVG generator
│   ├── uploads/             # Physical medical reports directory
│   ├── logs/                # Local log output files (combined.log, error.log)
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/      # Reusable Layout, RoleRoute, ErrorBoundary, Cards
    │   ├── contexts/        # React Contexts (AuthContext)
    │   ├── pages/           # Pages (Dashboard, Reports, Medicines, Profiles)
    │   ├── utils/           # Client API client (Axios), Centralized Logger
    │   ├── App.jsx          # Route structures & Provider setup
    │   └── main.jsx
    ├── package.json
    └── tailwind.config.js
```

---

## 6. Database Design (MongoDB & Mongoose)

The data layer uses Mongoose Object Document Mapper. Relationships are represented as Document Object Reference IDs (`mongoose.Schema.Types.ObjectId`).

### 6.1 Mongoose Schemas Overview

#### 1. User Schema (`User.js`)
* `email`: String (Unique, Indexed, required)
* `passwordHash`: String (required)
* `fullName`: String (required)
* `role`: String (enum: `patient`, `doctor`, required)
* `doctorCategory`: ObjectId (ref: `DoctorCategory`)
* `doctorSpecialty`: ObjectId (ref: `DoctorSpecialty`)
* `createdAt`: Date (default: Date.now)

#### 2. DoctorProfile Schema (`Profiles.js`)
* `user`: ObjectId (ref: `User`, required, Unique)
* `degrees`: [String]
* `specialization`: String
* `experienceYears`: Number
* `licenseNumber`: String
* `licenseIssuingAuthority`: String
* `clinicName`: String
* `clinicAddress`: String
* `clinicPhone`: String
* `clinicEmail`: String
* `bio`: String
* `visibleFields`: Map (keys to Boolean options)

#### 3. PatientProfile Schema (`Profiles.js`)
* `user`: ObjectId (ref: `User`, required, Unique)
* `age`: Number
* `gender`: String
* `heightCm`: Number
* `weightKg`: Number
* `bmi`: Number
* `bloodGroup`: String
* `allergies`: String
* `chronicConditions`: String
* `lifestyleIndicators`: String
* `emergencyContactName`: String
* `emergencyContactPhone`: String

#### 4. Report Schema (`ReportAndLabValues.js`)
* `user`: ObjectId (ref: `User`, required, Indexed)
* `fileName`: String (required)
* `filePath`: String (required)
* `fileType`: String (required)
* `ocrStatus`: String (enum: `pending`, `processing`, `completed`, `failed`, default: `pending`)
* `extractedText`: String
* `aiSummary`: String
* `category`: ObjectId (ref: `ReportCategory`)
* `reportDate`: Date (Indexed)
* `uploadDate`: Date (default: Date.now)

#### 5. LabValue Schema (`ReportAndLabValues.js`)
* `report`: ObjectId (ref: `Report`, required, Indexed)
* `parameterName`: String (required, Indexed)
* `value`: Number (required)
* `unit`: String (required)
* `referenceRange`: String
* `isAbnormal`: Boolean (default: false)

#### 6. PatientDoctorAccess Schema (`AccessAndCategories.js`)
* `patient`: ObjectId (ref: `User`, required, Indexed)
* `doctor`: ObjectId (ref: `User`, required, Indexed)
* `status`: String (enum: `pending`, `approved`, `rejected`, `revoked`, default: `pending`)
* `grantedAt`: Date
* `revokedAt`: Date

#### 7. Message Schema (`Message.js`)
* `sender`: ObjectId (ref: `User`, required)
* `receiver`: ObjectId (ref: `User`, required)
* `messageText`: String (required)
* `isRead`: Boolean (default: false)
* `createdAt`: Date (default: Date.now)

---

## 7. Authentication & Authorization

### 7.1 JWT Token Lifecycle
Authentication is stateless. The client logs in, receives a bearer token, and supplies it in the `Authorization: Bearer <token>` header for subsequent requests.

### 7.2 Password Hashing
Managed via `bcryptjs` using a salt work factor of `12`.
```javascript
import bcrypt from 'bcryptjs';

// Hashing during registration
const passwordHash = await bcrypt.hash(password, 12);

// Verification during login
const isValid = await bcrypt.compare(enteredPassword, user.passwordHash);
```

### 7.3 Middleware Routing Protection
```javascript
// backend/src/middleware/auth.js
export const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return next(new UnauthorizedError('Token required'));
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new UnauthorizedError('User not found'));
    
    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    
    // Inject into logger AsyncLocalStorage context
    const store = loggerContext.getStore();
    if (store) {
      store.userId = req.user.id;
      store.role = req.user.role;
    }
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid credentials'));
  }
};
```

---

## 8. Backend API Documentation

### 8.1 Authentication
* `POST /api/auth/register` - Create user. Request body validates against role schemas.
* `POST /api/auth/login` - Verify credentials and return JWT token.
* `GET /api/auth/me` - Resolve current user details from JWT token.

### 8.2 Medical Reports
* `POST /api/reports/upload` - Upload PDF/image (Multipart/form-data). Triggers async background parser.
* `GET /api/reports` - Query all reports. Evaluates doctor/patient relationships.
* `GET /api/reports/:id` - Fetch details, parameters, and AI summary.
* `DELETE /api/reports/:id` - Deletes reports and corresponding lab records.

### 8.3 Patient Analytics & SVG Trends
* `GET /api/analytics/summary` - General counts, normal/flagged statistics.
* `GET /api/analytics/comparison` - Returns custom-designed comparisons SVG.
* `GET /api/analytics/trend/:parameter_name` - Returns dynamically generated vector SVG trend line.
* `GET /api/analytics/correlation` - Pearson correlation matrix coefficients.

### 8.4 Doctor Access
* `POST /api/access/request` - Patient requests access to a doctor.
* `POST /api/access/approve/:request_id` - Doctor accepts access.
* `POST /api/access/revoke/:request_id` - Patient revokes doctor access.

---

## 9. Report Upload & Processing Flow

```
[Upload PDF/Image] ──► Save metadata (OCR: pending)
                             │
                             ▼
                    Return status: 200 (Success)
                             │
                             ├─► [Background Process Started]
                             │   ├─► Read File Buffer
                             │   ├─► OCR / PDF extract (pdf-parse / Tesseract.js)
                             │   ├─► Match lines against standard ranges
                             │   ├─► Call OpenRouter LLM for Summary
                             │   └─► Save LabValues & update OCR status: completed
```

---

## 10. Medicine Management

- **Patient Access**: CRUD actions to record prescription drugs, dosage, frequency, start date, and current/past status.
- **Doctor Access**: Read-only tracking of active patient medications, with the ability to append modifications for authorized patients.

---

## 11. Doctor-Patient Access System

Access control operates on an explicit consent model:
1. Patients search for doctors based on categories and specialties.
2. A patient sends a connection request (`PatientDoctorAccess` record with state `pending`).
3. The doctor views this connection under requests and accepts (`approved`) or declines (`rejected`).
4. Upon approval, the patient appears in the doctor's "Your Patients" list.
5. If the patient revokes access (`revoked`), the doctor loses access instantly.

---

## 12. Analytics & SVG Generation Module

### 12.1 Dynamic SVG Generation
Instead of using front-end canvas libraries, the backend generates crisp vector SVGs dynamically:
- **Trend Charts (`/api/analytics/trend/:parameter_name`)**: Resolves historic parameter entries, projects coordinates, and generates path tags (`<path d="..." />`), gridlines, and labels.
- **Comparison Heatmaps (`/api/analytics/comparison`)**: Draws parameter boxes, scales heights relative to universal ranges, and colors elements based on abnormality.

### 12.2 Pearson Correlation Matrix
Computed on-the-fly using the Pearson correlation coefficient algorithm to reveal dependencies between variables:
$$r = \frac{\sum (x - \bar{x})(y - \bar{y})}{\sqrt{\sum (x - \bar{x})^2 \sum (y - \bar{y})^2}}$$

---

## 13. AI/ML Summary Module

Summaries are generated through a hybrid extraction pipeline:
1. **Primary Model**: Calls OpenRouter API (`inclusionai/ling-3.0-flash:free`) passing JSON values or raw scanned blocks.
2. **Deterministic Fallback**: If api keys are absent, network timeouts occur, or the API fails, it falls back to a rule-based algorithm:
   `"Extracted report contains N key indicators. General status: abnormalities flagged / all normal."`

---

## 14. Frontend Architecture

- **State Sync**: React Query maintains server state synchronization, cache invalidation, and optimistic updates.
- **UI Components**: Structured with Tailwind CSS and modular layouts.
- **Global Error Handling (`frontend/src/components/ErrorBoundary.jsx`)**: Class component wrapping the app shell. Catch-blocks format error payloads and submit them to the server log endpoint.
- **Centralized Logger (`frontend/src/utils/logger.js`)**: Decouples terminal tracing. Forwards production warnings/errors to `/api/logs` via HTTP.

---

## 15. Backend Architecture & Central Logging System

### 15.1 Logging Infrastructure
- **Winston Centralized Logging**: Outputs JSON formatted logs in production and clean console text in development.
- **Sensory Security**: Formatting functions scan log metadata to automatically censor properties containing sensitive keywords (like password, token, key).
- **Context Storage Middleware**: Creates an execution scope mapping `x-request-id` to the context:
```javascript
// backend/src/middleware/requestLogger.js
export const requestLogger = (req, res, next) => {
  const startTime = process.hrtime();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  const contextStore = {
    requestId,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent']
  };
  
  loggerContext.run(contextStore, () => {
    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round(diff[0] * 1e3 + diff[1] * 1e-6);
      logger.info(`API ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${durationMs}ms)`);
    });
    next();
  });
};
```

---

## 16. Setup Instructions

### Prerequisites
- Node.js (v18.x or higher)
- MongoDB Instance (Atlas cluster URL or Local instance)

### Installation

1. **Clone the repository** and navigate to the project directory:
   ```bash
   cd project3
   ```

2. **Configure Backend**:
   Create `backend/.env`:
   ```env
   PORT=8000
   MONGODB_URI=mongodb://127.0.0.1:27017/medical_analyzer
   JWT_SECRET=super_secret_jwt_key_123!
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   NODE_ENV=development
   ```

3. **Install dependencies & start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Configure Frontend**:
   Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

5. **Install dependencies & start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 17. Sample Credentials & Dummy Data

The database is seeded automatically with dummy datasets upon connection.

- **Patient Account**:
  - Email: `patient@example.com`
  - Password: `Password123`
- **Doctor Account**:
  - Email: `cardiologist@example.com`
  - Password: `password123`

---

## 18. Application Usage & User Flows

This section explains how to use the application step-by-step for testing or local development.

### 18.1 Patient User Journey

1. **Registration & Profile Creation**
   - Click "Register", select the **Patient** role, and sign up.
   - Go to **Profile** and fill in your details (Age, Gender, Weight, Height, Blood Group, Allergies, Chronic Conditions). Your BMI will be calculated automatically.
   
2. **Uploading Medical Reports**
   - Navigate to the **Upload Report** section.
   - Select a standard medical report (PDF or Image, e.g., blood test reports containing HbA1c, Hemoglobin, RBC, WBC, Cholesterol, LDL, or HDL).
   - Once submitted, you'll be redirected to the **Reports** page. The document status will be shown as **pending** or **processing**.
   - Within seconds, the status will update to **completed**. Click **View Report** to review extracted lab values, normal/abnormal ranges, and the AI-generated report summary.

3. **Tracking Medications**
   - Navigate to **Medicines**.
   - Add new prescriptions (Name, Dosage, Frequency, Start Date, and optional End Date).
   - Once the End Date passes, the system automatically shifts the medicine from **Current** to **Past** status. You can also manually stop a current medication.

4. **Connecting with Doctors**
   - Click **Find Doctors**. Search for doctors by specialty category (e.g., Cardiology, Neurology) or by doctor name.
   - Click **Request Access** on a doctor's card. This sends an access request to that doctor. Access remains **pending** until the doctor approves it. You can revoke it at any point.

5. **Viewing Health Analytics**
   - Go to the **Analytics** page.
   - **Health Summary**: Displays key statistics like Total Reports, Flagged (Abnormal) Values, and Normal Values alongside abnormal parameters highlighted in red.
   - **Parameter Trends**: Toggle specific lab parameters (e.g., HbA1c, LDL) to render interactive trend line graphs showing value changes over time.
   - **Correlation Heatmap**: Visualizes relationships between different lab values calculated using the Pearson correlation coefficient.

---

### 18.2 Doctor User Journey

1. **Registration & Specialty Setup**
   - Register as a **Doctor**. You must select a specialty Category (e.g., Cardiology) and Specific Specialty (e.g., Heart) during registration.
   
2. **Managing Patient Access Requests**
   - Upon logging in, go to the **Dashboard**.
   - Check the **Patient Access Requests** section. You will see incoming requests from patients requesting connection.
   - Click **Approve** to accept a request or **Reject** to deny it.

3. **Reviewing Patient Records (Patient-First Analytics)**
   - Click **Your Patients** from the sidebar or dashboard.
   - You will see a list of patients who have approved your access. You can search patients by name or email.
   - Click **View Analytics** on any patient.
   - This opens a patient-specific clinical screen where you can:
     - View their extracted lab parameters, abnormalities, and AI-generated report summaries.
     - Look over their current and historical medication lists.
     - View their trend lines and correlation matrix.
     - **Add Clinical Notes**: Write a consult note using the Quill rich-text editor. These notes are saved to the patient's record.

---

## 19. Interview Preparation Guide

This layout prepares you to discuss architectural details suitable for senior developer roles:
- **Core Architecture**: Node.js/Express with MongoDB offers non-blocking async execution, ideal for processing metadata and concurrent OCR uploads.
- **Logging Design**: The combination of `AsyncLocalStorage` and `Winston` ensures request lifecycle tracking without manual ID passing, providing structured correlation logs.
- **Client Stability**: Using a global React Error Boundary prevents blank screens on component rendering exceptions, and log reporting helps developers catch client errors in production.

---

## 20. Interview Questions & Answers (Node.js & MongoDB)

**Q1: Explain the request lifecycle in your Express.js backend for protected routes.**
- Client requests hit the Express routing chain.
- The `requestLogger` middleware executes, establishes an `AsyncLocalStorage` store, and issues a correlation `x-request-id`.
- The `authenticateToken` middleware parses the authorization header, verifies the JWT, retrieves the Mongoose User document, and attaches the user payload to `req.user` while updating the storage context.
- The route controller processes the request and contacts database models.
- If errors arise, `next(error)` hands them to the global `errorHandler` middleware. Otherwise, a response is returned.

**Q2: How does your application process documents in the background without blocking execution?**
- In `uploadReport` within `reportsService.js`, once Multer stores the physical file and a database record is created with an `ocrStatus` of `pending`, the service calls `processReportInBackground(reportId, filePath)` without awaiting it.
- Express returns a `200 Success` status to the patient immediately.
- The background promise runs independently, handles parsing (`pdf-parse` or Tesseract OCR), queries Mongoose to save parameters, and updates `ocrStatus` to `completed` or `failed`.

**Q3: How do Mongoose schemas compare to traditional MySQL schemas in this application?**
- Node/Mongoose handles structured data (e.g., embedding visibility parameters inside a map property within `DoctorProfile`) without requiring complex SQL joins.
- We implement references (`ref`) to link documents (e.g., `LabValue` references `Report`), maintaining relational-like consistency in MongoDB.

---

## 21. Current Limitations & Future Enhancements

- **Limitations**:
  - OCR performance is bound to single-threaded Node execution unless offloaded to worker threads.
  - JWT tokens cannot be invalidated mid-lifespan without database token blacklists.
- **Future Enhancements**:
  - Offload CPU-intensive OCR processes to worker threads or external serverless endpoints.
  - Add a refresh token rotation flow...


  ##Thanks for reading
