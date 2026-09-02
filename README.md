# Medical Report Analyzer (Express & MongoDB Implementation)

> A production-hardened full-stack web application for patients to upload medical reports and doctors to analyze patient health data with AI-powered insights, real-time analytics, and role-based access control.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features by Role](#2-features-by-role)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [PDF Upload & Storage Lifecycle](#5-pdf-upload--storage-lifecycle)
6. [OCR & Clinical Parsing Pipeline](#6-ocr--clinical-parsing-pipeline)
7. [Medical Document Validation](#7-medical-document-validation)
8. [AI Summarization & Grounding Engine](#8-ai-summarization--grounding-engine)
9. [Security & Production Hardening](#9-security--production-hardening)
10. [Database Design (MongoDB & Mongoose)](#10-database-design-mongodb--mongoose)
11. [Authentication & Access Control](#11-authentication--access-control)
12. [Backend API Documentation](#12-backend-api-documentation)
13. [Environment Variables](#13-environment-variables)
14. [Local Development](#14-local-development)
15. [Automated Testing & Regression Suites](#15-automated-testing--regression-suites)
16. [Production Deployment (Netlify + Render)](#16-production-deployment-netlify--render)
17. [Database Seeding](#17-database-seeding)
18. [Production Notes & Limitations](#18-production-notes--limitations)

---

## 1. Project Overview

### Problem Statement
Medical professionals and patients struggle to:
- Organize and analyze fragmented medical reports from multiple healthcare providers.
- Extract structured, actionable lab data from unstructured PDF reports and images.
- Track longitudinal health trends over time without manual data entry.
- Enable secure doctor-patient collaboration with explicit consent and access control.
- Highlight abnormal diagnostic parameters and potential health risks accurately without hallucination.

### Solution Overview
The **Medical Report Analyzer** automates the clinical workflow end-to-end:
1. **Patients** upload medical reports (PDF/images) → Automated OCR and clinical parsing extract key lab indicators.
2. **AI Processing** generates grounded clinical summaries using Hugging Face Inference (`Qwen/Qwen2.5-7B-Instruct` via Featherless AI provider).
3. **Data Storage** persists extracted lab values, text, and summaries in MongoDB Atlas while deleting physical PDFs from disk immediately post-processing.
4. **Analytics Engine** computes time-series trend lines, Pearson correlation matrices, and health summaries.
5. **Doctor Collaboration** allows authorized doctors to review patient health metrics under a patient-first consent model.

---

## 2. Features by Role

### 2.1 Patient Features
- **Registration & Authentication**: JWT-based authentication with bcrypt password encryption.
- **Dashboard**: Overview of total uploaded reports, flagged abnormalities, and recent reports.
- **Report Upload**: Multipart PDF/image upload with background text extraction and instant non-medical document validation.
- **Report Detail Viewer**: Structured lab values table, abnormal indicator badges, reference range evaluation, and AI summaries.
- **Health Analytics**: Parameter trend charts, Pearson correlation matrix, and status distributions.
- **Medicine Tracking**: Manage current and historical medications with auto-shifting past status based on end date.
- **Doctor Network**: Search registered doctors by specialty and manage access permissions.

### 2.2 Doctor Features
- **Doctor Registration**: Specialty taxonomy selection during onboarding.
- **Patient Access Dashboard**: Patient-first view displaying only patients with active, approved consent.
- **Clinical Analytics View**: Read-only access to an authorized patient's lab values, trends, and medication history.
- **Consultation Notes**: Rich-text clinical note creation for patient encounters using Quill.
- **Doctor Profile**: Manage qualifications, clinic details, and field visibility settings.

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 18.2.0 | UI component framework |
| | Vite | 5.0.8 | Frontend build tool and dev server |
| | React Router DOM | 6.20.0 | Single-page application routing |
| | TanStack React Query | 5.99.0 | Server state synchronization & caching |
| | Axios | 1.6.2 | HTTP client with request correlation interceptors |
| | Recharts | 3.8.1 | Interactive charts & analytics visualization |
| | Tailwind CSS | 3.3.6 | Utility-first CSS styling |
| | Socket.IO Client | 4.8.3 | Real-time websocket client updates |
| **Backend** | Node.js | ^20.x | JavaScript runtime environment |
| | Express.js | 4.19.2 | Web API framework |
| | Helmet | 8.3.0 | HTTP security headers middleware |
| | Express Rate Limit | 8.7.0 | API rate limiting protection |
| | Winston | 3.19.0 | Centralized structured JSON logging |
| | Multer | 1.4.5 | Multipart file upload handling with 10MB limit |
| | Socket.IO | 4.8.3 | Real-time websocket server |
| | jsonwebtoken, bcryptjs | 9.0.2 / 2.4.3 | Authentication & password hashing |
| **Database** | MongoDB / Mongoose | 8.2.0 | Document database & ODM |
| **OCR Engine** | Scribe.js OCR / Tesseract.js / pdf-parse | 0.14.6 / 7.0.0 / 2.4.5 | Multi-page PDF and image text recognition |
| **AI Inference** | Hugging Face Inference SDK | 4.13.28 | Model: `Qwen/Qwen2.5-7B-Instruct`<br>Provider: `featherless-ai` |

---

## 4. System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                    React SPA (Netlify)                            │
│  - Axios Client (x-request-id)  - React Query  - Recharts UI     │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                          HTTPS / REST API
                       Bearer JWT + CORS_ORIGIN
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                  Express.js Backend (Render)                      │
│  - Helmet Headers  - Rate Limiter  - Request Logger (Winston)     │
│  - Multer Uploads  - Auth Middleware  - Error Sanitization Handler │
└──────┬──────────────────────────┬──────────────────────────┬──────┘
       │                          │                          │
  Mongoose ODM               Background OCR              Inference API
       │                    (Concur. = 1)                    │
       ▼                          ▼                          ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────────────┐
│ MongoDB      │          │ Scribe.js    │          │ Hugging Face API     │
│ Atlas        │          │ OCR Engine   │          │ Qwen2.5-7B-Instruct  │
└──────────────┘          └──────────────┘          │ (featherless-ai)     │
                                                    └──────────────────────┘
```

---

## 5. PDF Upload & Storage Lifecycle

The application follows an **ephemeral storage pattern** optimized for Render's non-persistent container filesystem:

1. **Initial Staging**: When a user uploads a PDF, Multer writes the file to `backend/uploads/<timestamp>_<filename>`.
2. **No Permanent PDF Storage**: The original binary PDF is **NEVER** stored permanently on disk, in MongoDB, or in external cloud storage (S3/R2/GCS).
3. **Data Extraction & Database Persistence**: Only extracted text (`Report.extractedText`), structured parameters (`LabValue` collection), report metadata (`fileName`, `fileType`, `uploadDate`), and AI summaries are saved in MongoDB Atlas.
4. **Automatic File Deletion**:
   - **On Success**: As soon as OCR extraction and DB persistence finish, `removeTemporaryFile(filePath)` unlinks the physical PDF from disk and updates `Report.filePath` to `null`.
   - **On Rejection**: If the file fails non-medical validation, it is deleted from disk immediately via `fs.promises.unlink`.
   - **On Error**: If OCR or text validation fails, the physical PDF is unlinked immediately and `Report.ocrStatus` is updated to `'failed'`.
5. **Render Ephemeral Compatibility**: Because physical PDFs exist only for a few seconds during processing, the application requires **no external S3/R2 storage** and is 100% compatible with Render's ephemeral filesystem.

---

## 6. OCR & Clinical Parsing Pipeline

The background OCR pipeline operates with a strictly enforced single-threaded concurrency limit (`MAX_CONCURRENT_OCR = 1`) to prevent CPU saturation:

```
[Upload PDF] ──► Pre-Upload Validation (isMedicalDocument)
                       │
                       ├─► Rejected ──► Delete PDF ──► Return HTTP 400 (INVALID_MEDICAL_REPORT)
                       │
                       ▼ Accepted
            Save Report (ocrStatus: pending) ──► Return HTTP 200
                       │
                       ▼ Async Queue (ocrQueue concurrency = 1)
            Scribe.js / pdf-parse OCR Text Extraction
                       │
                       ▼
            Clean Text & Multi-Line Context Reconstruction
                       │
                       ▼
            Structured Lab Parameter Parsing & Unit Validation
                       │
                       ▼
            Deterministic Reference Range Evaluation (within / outside / unknown)
                       │
                       ▼
            Save LabValue Documents to MongoDB
                       │
                       ▼
            Call Hugging Face Inference API (Qwen2.5-7B-Instruct)
                       │
                       ▼
            Sanitize & Ground AI Summary ──► Save Report (ocrStatus: completed, filePath: null)
                       │
                       ▼
            Delete Temporary PDF File from backend/uploads/
```

---

## 7. Medical Document Validation

- **Medical Classification Gate (`isMedicalDocument`)**: Validates extracted text against clinical terms (lab analytes, diagnostic headers, medical test names) versus non-medical patterns (invoices, resumes, receipts).
- **Valid Report Handling**: Saved to MongoDB, processed in background queue, structured parameters saved, AI summary generated, physical file deleted, `ocrStatus` set to `'completed'`.
- **Non-Medical / Invalid Report Handling**: Immediately rejected at API boundary with HTTP 400 and error code `INVALID_MEDICAL_REPORT`. The uploaded file is deleted from disk instantly without saving a `Report` record in MongoDB. If caught during background processing, existing records are cleaned up and the report is deleted.
- **OCR Failure Handling**: If PDF text cannot be read or is corrupted, `ocrStatus` is set to `'failed'`, `filePath` is set to `null`, and the temporary file is unlinked.
- **AI Failure / Timeout Handling**: If the Hugging Face AI API times out (45s) or fails, the system automatically falls back to a deterministic rule-based summary (`Extracted report contains N key indicators...`). Processing still completes successfully (`ocrStatus: 'completed'`) and physical file is deleted.

---

## 8. AI Summarization & Grounding Engine

The application uses Hugging Face Inference for clinical summarization:

- **SDK**: `@huggingface/inference` (`HfInference`)
- **Model**: `Qwen/Qwen2.5-7B-Instruct`
- **Provider**: `featherless-ai`
- **Timeout**: `45,000ms` (`HF_TIMEOUT_MS`)
- **Token Limits**: `max_tokens = 220` for report summaries; `max_tokens = 300` for clinical chat.
- **Compact Structured Payload**: The AI request payload contains **NO raw OCR text**. It sends only a compact JSON representation of parsed lab parameters:
  ```json
  {
    "documentType": "CBC / Hematology Report",
    "labValues": [
      { "p": "RANDOM BLOOD SUGAR", "v": "110", "u": "mg/dL", "r": "80-140", "s": "Within Range" }
    ]
  }
  ```
- **Strict Grounding Rules**:
  - Structured lab data is the sole source of truth.
  - "Within Range" parameters must strictly state *"within the reference range provided in the report"*.
  - Parameters with unprovided reference ranges (`Unknown Range`) cannot be classified as normal or abnormal.
  - Unverified raw OCR artifacts (e.g. E.S.R.) are blocked from AI range classifications.
  - No independent disease diagnoses or clinical claims.
  - Maximum of 3 grounded observations.
- **Sanitizer & Fallback**: `sanitizeAndValidateAiSummary` strips ungrounded statements. If HF inference fails or is unconfigured, rule-based summary generation takes over.

---

## 9. Security & Production Hardening

- **Helmet Header Protection**: `helmet()` middleware enforces HTTP security headers (CSP, HSTS, X-Frame-Options).
- **API Rate Limiting**: `express-rate-limit` enforces a 300 requests per 15-minute window limit across `/api` routes.
- **Configurable CORS**: Replaced wildcard CORS with dynamic `CORS_ORIGIN` validation. Supports comma-separated origin lists with `credentials: true`. Fails closed (blocks all cross-origin requests) in production if `CORS_ORIGIN` is missing.
- **Production Error Masking**: `errorHandler` middleware masks internal 500 error details with a generic `'Internal Server Error'` response in production (`NODE_ENV === 'production'`) while logging full stack traces server-side.
- **Upload Size Limit**: Multer configured with `limits: { fileSize: 10 * 1024 * 1024 }` (10MB max). Oversized files return a clean HTTP 400 error.
- **Log Sanitization**: Removed sensitive patient AI summary text from production logs. Winston logger automatically redacts passwords, tokens, and authorization keys.
- **JWT & Password Security**: Passwords hashed with `bcryptjs` (salt factor 12). Stateless authentication via `Authorization: Bearer <token>` headers.

---

## 10. Database Design (MongoDB & Mongoose)

### 10.1 Key Models

1. **User (`User.js`)**: `email`, `passwordHash`, `fullName`, `role` (`'patient'` / `'doctor'`), `doctorCategory`, `doctorSpecialty`.
2. **Report (`ReportAndLabValues.js`)**: `user`, `fileName`, `filePath` (set to `null` post-processing), `fileType`, `uploadDate`, `reportDate`, `ocrStatus` (`'pending'` / `'processing'` / `'completed'` / `'failed'`), `rejectionReason`, `extractedText`, `aiSummary`, `aiSummaryData`, `category`.
3. **LabValue (`ReportAndLabValues.js`)**: `report`, `parameterName`, `valueType` (`'numeric'` / `'qualitative'`), `value`, `qualitativeValue`, `unit`, `referenceRange`, `referenceStatus` (`'within'` / `'outside'` / `'unknown'`), `isAbnormal`, `confidence`, `pageNumber`, `sourceText`, `evidenceSource`.
4. **PatientDoctorAccess (`AccessAndCategories.js`)**: `patient`, `doctor`, `status` (`'pending'` / `'approved'` / `'rejected'` / `'revoked'`), `grantedAt`, `revokedAt`.
5. **DoctorProfile & PatientProfile (`Profiles.js`)**: Specialty credentials, patient health metrics (BMI, blood group, allergies), and doctor visibility settings.

---

## 11. Authentication & Access Control

- **Role-Based Access Control (RBAC)**: Enforced via `authenticateToken` middleware and frontend `RoleRoute` wrappers.
- **Consent-Based Access**: Doctors can ONLY access reports and analytics for patients who have explicitly sent and approved an access request (`PatientDoctorAccess`). Access can be revoked by the patient at any time.

---

## 12. Backend API Documentation

### Authentication
- `POST /api/auth/register` — Register a new patient or doctor account.
- `POST /api/auth/login` — Authenticate credentials and receive a JWT.
- `GET /api/auth/me` — Resolve current user context from JWT token.

### Medical Reports
- `POST /api/reports/upload` — Upload medical PDF or image (10MB max).
- `GET /api/reports` — Fetch report listings (filtered by patient consent for doctors).
- `GET /api/reports/:id` — Fetch detailed report metadata, lab values, and AI summary.
- `DELETE /api/reports/:id` — Delete a report and its associated lab values.

### Analytics
- `GET /api/analytics/summary` — Patient lab summary statistics (total, normal, abnormal).
- `GET /api/analytics/trend/:parameter_name` — Time-series trend data for a specific lab parameter.
- `GET /api/analytics/correlation` — Pearson correlation matrix coefficients.

### Doctor Access
- `POST /api/access/request` — Patient sends access request to a doctor.
- `POST /api/access/approve/:request_id` — Doctor approves patient access request.
- `POST /api/access/revoke/:request_id` — Patient revokes doctor access.

---

## 13. Environment Variables

Strictly validated at backend startup via Zod (`backend/src/config/env.js`).

### Backend Environment Variables (Render)

| Variable | Required? | Default | Description |
|---|:---:|---|---|
| `PORT` | No | `8000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWT authentication tokens |
| `HF_TOKEN` | No | — | Hugging Face API access token for AI summarization |
| `HF_MODEL` | No | `Qwen/Qwen2.5-7B-Instruct` | Hugging Face model identifier |
| `HF_TIMEOUT_MS` | No | `45000` | Hugging Face API timeout in milliseconds |
| `CORS_ORIGIN` | No | — | Allowed frontend origin URL(s), comma-separated |

### Frontend Environment Variables (Netlify)

| Variable | Required? | Description |
|---|:---:|---|
| `VITE_API_BASE_URL` | **Yes** | Full URL of backend API (e.g. `https://medical-analyzer-api.onrender.com`) |

> [!IMPORTANT]
> Backend secrets (`HF_TOKEN`, `JWT_SECRET`, `MONGODB_URI`) MUST remain on Render only. Never expose secrets to the frontend via `VITE_*` variables.

---

## 14. Local Development

### Prerequisites
- Node.js (v18+ or v20+)
- MongoDB instance (local or MongoDB Atlas cluster)

### 1. Setup Backend
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/medical_analyzer
JWT_SECRET=your_local_dev_secret_key
HF_TOKEN=your_hugging_face_token
HF_MODEL=Qwen/Qwen2.5-7B-Instruct
HF_TIMEOUT_MS=45000
CORS_ORIGIN=http://localhost:5173
```
Run Backend in development mode:
```bash
npm run dev
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
```
Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```
Run Frontend in development mode:
```bash
npm run dev
```

---

## 15. Automated Testing & Regression Suites

The project contains 8 automated test suites verifying OCR parsing, token compaction, grounding rules, and data invariants:

```bash
cd backend

# Run Extraction & Token Optimization Suite (Payload compacting, max_tokens=220, grounding)
node --test src/tests/extractionAndTokenOptimization.test.js

# Run Hugging Face Featherless AI Integration Test Suite
node --test src/tests/hfSummaryIntegration.test.js

# Run AI Grounding & Sanitizer Regression Suite
node --test src/tests/aiSummaryGroundingRegression.test.js

# Run Document Classification & Database Persistence Suite
node --test src/tests/classificationAndPersistence.test.js

# Run Concurrent OCR Queue Suite (Concurrency = 1 verification)
node --test src/tests/concurrentOcrQueue.test.js

# Run Full Clinical Extraction Regression Suite
node --test src/tests/fullExtractionRegression.test.js

# Run Production End-to-End Pipeline Audit Suite
node --test src/tests/productionPipelineEndToEnd.test.js

# Run UI Data Contract Regression Suite
node --test src/tests/uiDataContractRegression.test.js
```

---

## 16. Production Deployment (Netlify + Render)

### 16.1 Netlify Deployment (Frontend)
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Environment variable**: `VITE_API_BASE_URL` = `https://<your-render-app>.onrender.com`
- **SPA Routing**: Handled via `frontend/public/_redirects` (`/* /index.html 200`).

### 16.2 Render Deployment (Backend)
- **Service type**: Web Service
- **Root directory**: `backend`
- **Build command**: `npm install`
- **Start command**: `npm start`
- **Health check path**: `/health`
- **Environment variables**: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `HF_TOKEN`, `HF_MODEL`, `HF_TIMEOUT_MS`, `CORS_ORIGIN=https://<your-netlify-app>.netlify.app`

### 16.3 MongoDB Atlas Configuration
- Add `0.0.0.0/0` to **Network Access IP Whitelist** to allow connections from Render's dynamic egress IP pool.

---

## 17. Database Seeding

- **Development Mode**: `seedDatabase()` runs automatically on backend startup when `NODE_ENV === 'development'`.
- **Production Mode**: Automatic startup seeding is **disabled** when `NODE_ENV === 'production'`.
- **Manual Production Seeding**: To populate taxonomy data (report categories, doctor specialties, reference ranges) in production, execute the seed script manually from the backend terminal:
  ```bash
  node src/utils/seed.js
  ```

---

## 18. Production Notes & Limitations

- **Ephemeral Storage**: Physical PDFs are deleted immediately after text extraction. The application does not retain original uploaded files on disk or in the database.
- **OCR Concurrency**: Background OCR processing operates with a concurrency limit of `1` (`MAX_CONCURRENT_OCR = 1`) to preserve server memory and CPU resources.
- **Synchronous Pre-Check**: Pre-upload medical document validation runs synchronously during upload. Large PDF files (10MB) may take 15–30 seconds to parse.
- **Medical Disclaimer**: This application is a technical demonstration for clinical data extraction, visualization, and AI summarization. It is not a certified medical device and should not be used for emergency medical diagnosis.
