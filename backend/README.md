# Medical Report Analyzer — Backend API

> A production-hardened RESTful API and WebSocket backend built with Node.js, Express.js, and MongoDB Atlas. Powers optical character recognition (OCR), clinical lab parameter extraction, grounded AI summarization, and real-time doctor-patient collaboration.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19.2-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Hugging Face](https://img.shields.io/badge/Hugging_Face-Qwen2.5--7B-FFD21E?style=flat&logo=huggingface&logoColor=black)](https://huggingface.co/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)

---

## 1. Core Architecture & Processing Pipelines

### 1.1 Low-Memory OCR & Clinical Parsing Pipeline
Designed specifically to prevent Out-Of-Memory (OOM) crashes in memory-constrained cloud environments (such as Render's 512MB RAM free tier):
- **Dual Extraction Strategy**:
  - Digital/text-native PDFs are extracted in milliseconds using `pdf-parse`.
  - Scanned image PDFs and image uploads route to the OCR queue.
- **Strict Concurrency**: Background OCR execution is throttled to `MAX_CONCURRENT_OCR = 1` via an internal FIFO queue.
- **150 DPI Rasterization**: PDF pages are rendered at 150 DPI (down from 300+ DPI), reducing canvas memory allocation by ~75% without sacrificing OCR character accuracy.
- **Worker Lifecycle Recycling**: OCR workers (`Scribe.js` / `Tesseract.js`) are explicitly terminated (`worker.terminate()`) between documents, preventing memory leaks over extended server uptime.
- **Memory-Safe Canvas Buffer Release**: Intermediate rendering structures and raw pixel buffers are freed prior to OCR recognition.
- **Halftone Filter Bypass**: Bypasses heavy halftone image manipulation pipelines in favor of lightweight contrast thresholding.

### 1.2 Ephemeral PDF Storage Pattern
The backend enforces a zero-retention ephemeral storage lifecycle:
1. Multer receives and stages incoming files to `backend/uploads/<timestamp>_<filename>`.
2. Text extraction and clinical parsing execute in background memory.
3. Extracted lab values, text, and AI summaries are persisted into MongoDB Atlas.
4. The physical PDF file on disk is immediately deleted (`fs.promises.unlink`) in all lifecycle scenarios (success, non-medical document rejection, or OCR failure).
5. The `Report.filePath` database field is cleared to `null`.
6. Zero permanent binary storage is required on Render, eliminating the need for S3/R2 object storage buckets.

### 1.3 Grounded AI Summarization Engine
- **Inference Provider**: Hugging Face Inference SDK (`@huggingface/inference`) with `Qwen/Qwen2.5-7B-Instruct` hosted via the `featherless-ai` provider.
- **Compact Structured Payload**: Never sends raw OCR text to the AI model. Instead, sends a minimal JSON payload containing only structured lab parameters, units, and evaluated reference ranges.
- **Strict Clinical Grounding**:
  - Enforces reference-range grounded summaries (*"within the reference range provided in the report"*).
  - Flags ungrounded assumptions or hallucinated medical diagnoses.
  - Summaries are capped at a maximum of 3 clinical observations with a hard token budget (`max_tokens = 220`).
- **Deterministic Rule Fallback**: If the Hugging Face API times out (45s) or returns an error, the engine seamlessly produces a deterministic, rule-based summary without failing the report.

### 1.4 Real-Time WebSocket Messaging (Socket.IO)
- Secure, authenticated bi-directional messaging between connected doctors and patients.
- Active conversation list with unread count tracking and latest message previews.
- Permanent conversation deletion endpoints and real-time chat cleanup events.

---

## 2. Directory Structure

```
backend/
├── data/                       # Seed taxonomy data (categories, specialties, ranges)
├── logs/                       # Winston structured runtime logs
├── src/
│   ├── config/
│   │   ├── db.js               # MongoDB connection with retry logic
│   │   └── env.js              # Zod environment variable schema & startup validation
│   ├── controllers/            # Express route controllers
│   ├── errors/                 # Custom AppError and standardized error definitions
│   ├── middleware/
│   │   ├── auth.js             # JWT verification and RBAC middleware
│   │   ├── errorHandler.js     # Centralized error handler with production error masking
│   │   ├── requestLogger.js    # Winston HTTP request correlation logger
│   │   └── validate.js         # Zod request validation middleware
│   ├── models/
│   │   ├── AccessAndCategories.js # PatientDoctorAccess & ReportCategory schemas
│   │   ├── DoctorTaxonomy.js   # Clinical specialties and category taxonomies
│   │   ├── MedicineAndNotes.js # Patient medications & Doctor clinical notes
│   │   ├── Message.js          # Direct chat messages
│   │   ├── Profiles.js         # PatientProfile & DoctorProfile schemas
│   │   ├── ReportAndLabValues.js # Report & LabValue schemas
│   │   ├── UniversalRange.js   # Clinical reference ranges catalog
│   │   └── User.js             # User identity, roles, and credential hashes
│   ├── routes/
│   │   ├── access.js           # Doctor-patient consent management
│   │   ├── analytics.js        # Lab summaries, trends, and correlation endpoints
│   │   ├── auth.js             # Register, login, and me endpoints
│   │   ├── chat.js             # Conversation history and message endpoints
│   │   ├── dashboard.js        # Aggregated overview endpoints
│   │   ├── doctorNotes.js      # Clinical consultation notes endpoints
│   │   ├── labValues.js        # Lab parameter queries
│   │   ├── logs.js             # System diagnostic log routes
│   │   ├── medicines.js        # Patient medication CRUD
│   │   ├── profiles.js         # Patient & Doctor profile management
│   │   ├── reports.js          # Report upload, retrieval, and deletion
│   │   ├── simulate.js         # Synthetic report simulation utilities
│   │   └── taxonomy.js         # Reference categories and specialties
│   ├── services/               # Core business logic and database operations
│   ├── tests/                  # Automated node test suites
│   ├── utils/
│   │   ├── analytics.js        # Pearson correlation and statistical computations
│   │   ├── asyncHandler.js     # Async wrapper for Express middleware
│   │   ├── chartGenerator.js   # Server-side chart generation helpers
│   │   ├── logger.js           # Winston logger configuration with sensitive data redacting
│   │   ├── parser.js           # Clinical parsing, OCR pipeline & AI summarization
│   │   ├── response.js         # Standardized API response formatters
│   │   ├── seed.js             # Database taxonomy seeding script
│   │   └── socketHandler.js    # Socket.IO event listeners and rooms
│   └── index.js                # Express application bootstrap & server initialization
├── uploads/                    # Temporary scratch folder for uploads (auto-unlinked)
├── .env.example
├── package.json
└── README.md
```

---

## 3. Environment Variables

All environment variables are strictly validated at backend startup via Zod in `src/config/env.js`:

| Variable | Required? | Default | Description |
|:---|:---:|:---:|:---|
| `PORT` | No | `8000` | Port for the HTTP and WebSocket server |
| `NODE_ENV` | No | `development` | Server runtime mode (`development`, `production`, `test`) |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | — | Secret key used to sign and verify JWT authentication tokens |
| `HF_TOKEN` | No | — | Hugging Face API access token for AI clinical summaries |
| `HF_MODEL` | No | `Qwen/Qwen2.5-7B-Instruct` | Target Hugging Face model identifier |
| `HF_TIMEOUT_MS`| No | `45000` | Timeout in milliseconds for Hugging Face inference requests |
| `CORS_ORIGIN` | No | — | Allowed frontend origin URL(s), comma-separated (e.g. `http://localhost:5173`) |

---

## 4. API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new patient or doctor account.
- `POST /api/auth/login` — Authenticate credentials and receive a JWT.
- `GET /api/auth/me` — Retrieve the currently authenticated user's profile and role.

### Medical Reports (`/api/reports`)
- `POST /api/reports/upload` — Multipart PDF or image upload (10MB limit). Validates medical content and enqueues OCR processing.
- `GET /api/reports` — List uploaded reports (patients see their own; authorized doctors see approved patients' reports).
- `GET /api/reports/:id` — Get detailed report metadata, extracted lab values, and AI summary.
- `DELETE /api/reports/:id` — Delete a report and cascade-delete its extracted lab values.

### Analytics (`/api/analytics`)
- `GET /api/analytics/summary` — Summary totals of normal vs. abnormal lab values.
- `GET /api/analytics/trend/:parameter_name` — Longitudinal time-series data for a biomarker.
- `GET /api/analytics/correlation` — Pearson correlation matrix for numerical lab values.

### Doctor Access & Consent (`/api/access`)
- `POST /api/access/request` — Patient sends an access request to a doctor.
- `POST /api/access/approve/:request_id` — Doctor approves a pending patient request.
- `POST /api/access/reject/:request_id` — Doctor rejects a pending patient request.
- `POST /api/access/revoke/:request_id` — Patient revokes doctor access to their records.

### Direct Messaging (`/api/chat`)
- `GET /api/chat/conversations` — Retrieve active conversations with latest message preview and unread counts.
- `GET /api/chat/history/:user_id` — Retrieve full chat message history with a specific doctor or patient.
- `POST /api/chat/send` — Send a direct message to a user.
- `DELETE /api/chat/conversation/:user_id` — Permanently delete all conversation messages between the two users.

### Medications (`/api/medicines`)
- `GET /api/medicines` — Get list of active and historical medications.
- `POST /api/medicines` — Add a new medication entry.
- `PUT /api/medicines/:id` — Update medication details or status.
- `DELETE /api/medicines/:id` — Delete a medication entry.

### Profiles (`/api/profiles`)
- `GET /api/profiles/patient` — Get authenticated patient's health indicators and vitals.
- `PUT /api/profiles/patient` — Update patient vitals (height, weight, blood group, allergies).
- `GET /api/profiles/doctor` — Get doctor's professional profile.
- `PUT /api/profiles/doctor` — Update doctor qualifications, clinic info, and visibility settings.

---

## 5. Automated Regression Test Suites

The backend includes a comprehensive suite of native Node.js tests verifying OCR extraction, memory safeguards, grounding invariants, and API contracts:

```bash
cd backend

# 1. Extraction & Token Optimization Suite (Payload compacting, max_tokens=220, grounding)
node --test src/tests/extractionAndTokenOptimization.test.js

# 2. Hugging Face Featherless AI Integration Test Suite
node --test src/tests/hfSummaryIntegration.test.js

# 3. AI Grounding & Sanitizer Regression Suite
node --test src/tests/aiSummaryGroundingRegression.test.js

# 4. Document Classification & Database Persistence Suite
node --test src/tests/classificationAndPersistence.test.js

# 5. Concurrent OCR Queue Suite (Concurrency = 1 verification)
node --test src/tests/concurrentOcrQueue.test.js

# 6. Full Clinical Extraction Regression Suite
node --test src/tests/fullExtractionRegression.test.js

# 7. Production End-to-End Pipeline Audit Suite
node --test src/tests/productionPipelineEndToEnd.test.js

# 8. UI Data Contract Regression Suite
node --test src/tests/uiDataContractRegression.test.js
```

---

## 6. Local Development & Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create and configure environment variables
cp .env.example .env
# Edit .env to set MONGODB_URI, JWT_SECRET, HF_TOKEN, etc.

# Start backend in development mode (with nodemon reload)
npm run dev

# Start backend in production mode
npm start
```

---

## 7. Database Seeding

- **Development**: When `NODE_ENV === 'development'`, taxonomy data (report categories, doctor specialties, and standard reference ranges) seeds automatically on server startup.
- **Production**: Startup seeding is skipped when `NODE_ENV === 'production'` to protect operational data. To manually populate taxonomy data in production:
  ```bash
  node src/utils/seed.js
  ```

