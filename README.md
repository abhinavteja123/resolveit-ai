# ResolveIT AI — Smart Runbook Resolution Assistant

> **RAG-powered IT support** — Semantic search through runbooks with AI-generated resolution steps.

![Stack](https://img.shields.io/badge/Python-FastAPI-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase)
![Stack](https://img.shields.io/badge/Supabase-DB-3ECF8E?style=flat-square&logo=supabase)
![Stack](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google)

---

## 🏗️ Architecture

```
User → React (Firebase Google Auth) → FastAPI Backend
                                         ├── FAISS Vector Search (all-MiniLM-L6-v2)
                                         ├── Cross-Encoder Re-Ranking (ms-marco-MiniLM)
                                         ├── Gemini 1.5 Flash (RAG Generation)
                                         └── Supabase PostgreSQL (Metadata + Logs)
```

## ✨ Features

- **Multi-format ingestion** — PDF, DOCX, TXT runbooks parsed and indexed
- **Section-aware chunking** — Intelligent splitting by headings with sliding-window fallback
- **Semantic search** — FAISS vector similarity with HuggingFace embeddings
- **Cross-encoder re-ranking** — Precision improvement over basic cosine similarity
- **RAG generation** — Gemini LLM generates step-by-step resolution with cited sources
- **Confidence scoring** — Sigmoid-normalized rerank scores (0–1)
- **Feedback loop** — 👍/👎 ratings stored in PostgreSQL for quality tracking
- **Query audit log** — Full history of past queries with expandable responses
- **Admin dashboard** — Upload runbooks, view indexed files, monitor feedback stats
- **Firebase Google Auth** — One-click Google sign-in with JWT verification

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Firebase project** with Google Auth enabled
- **Supabase project** with the required tables
- **Google Gemini API key**

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd resolveit-ai
```

### 2. Supabase Database Setup

Create these tables in your Supabase SQL Editor:

```sql
CREATE TABLE runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  title TEXT,
  category TEXT,
  file_type TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  chunk_count INTEGER,
  is_indexed BOOLEAN DEFAULT FALSE
);

CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  query_text TEXT NOT NULL,
  retrieved_sources TEXT[],
  llm_response TEXT,
  confidence_score FLOAT,
  queried_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_log_id UUID REFERENCES query_logs(id),
  user_id TEXT,
  rating INTEGER CHECK (rating IN (1, -1)),
  comment TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → **Google** sign-in provider
4. Go to **Project Settings** → **Service Accounts** → **Generate New Private Key**
5. Save the JSON file as `backend/firebase-service-account.json`
6. Go to **Project Settings** → **General** → **Your apps** → **Web app**
7. Copy the Firebase config values to `frontend/.env`

### 4. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

# Configure environment
# Edit .env with your Supabase + Gemini credentials

# Run
uvicorn main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit .env with your Firebase config

# Run
npm run dev
```

### 6. Open in Browser

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin ops) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON |
| `FAISS_INDEX_PATH` | Where to store FAISS index (default: `./faiss_index`) |
| `ADMIN_EMAILS` | Comma-separated admin email list |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_BASE_URL` | Backend URL (default: `http://localhost:8000`) |

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/me` | Bearer JWT | Get current user info |
| POST | `/auth/verify` | Bearer JWT | Verify Firebase token |
| POST | `/query` | Bearer JWT | Run RAG query |
| GET | `/history` | Bearer JWT | Get user query history |
| POST | `/feedback` | Bearer JWT | Submit thumbs up/down |
| POST | `/admin/upload` | Bearer JWT (admin) | Upload + index runbook |
| GET | `/admin/runbooks` | Bearer JWT (admin) | List all runbooks |
| GET | `/admin/feedback-stats` | Bearer JWT (admin) | Feedback analytics |

---

## 🐳 Docker

```bash
docker-compose up --build
```

---

## 📝 Resume Bullet

```
ResolveIT AI – RAG-based IT Runbook Assistant | Python, FAISS, FastAPI, React, Gemini  2025
– Built a semantic retrieval system indexing multi-format runbooks (PDF/DOCX/TXT) using
  FAISS + HuggingFace all-MiniLM-L6-v2 embeddings with section-aware chunking and
  cross-encoder re-ranking (ms-marco-MiniLM) improving retrieval precision.
– Implemented end-to-end RAG pipeline with Gemini 1.5 Flash summarization, generating
  actionable resolution steps with confidence scoring and cited source attribution.
– Deployed full-stack with React/Tailwind admin dashboard, Firebase Google authentication,
  Supabase PostgreSQL backend, query audit logging, and a feedback loop for quality tracking.
```

---

*Built by Mariyala Abhinav Teja — Full-Stack AI/ML Project*
