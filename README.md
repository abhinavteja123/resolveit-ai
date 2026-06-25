# ResolveIT AI — Smart Runbook Resolution Assistant

> **RAG-powered IT support** — Ask in plain English, get cited, step-by-step
> resolutions drawn **only** from your indexed runbooks. Never hallucinated.

![Stack](https://img.shields.io/badge/Python-FastAPI-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase)
![Stack](https://img.shields.io/badge/Supabase-DB-3ECF8E?style=flat-square&logo=supabase)
![Stack](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google)

ResolveIT AI turns a pile of IT runbooks (PDF / DOCX / TXT) into a searchable
assistant. Ask a question — _"Apache returning 502"_, _"DNS resolution failing"_ —
and get a cited, step-by-step fix from your runbooks. If nothing relevant is
indexed, it **refuses and tells you to escalate** instead of guessing.

---

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────────────────────────────────────┐
│   React     │      │                 FastAPI                       │
│  + Vite     │─────▶│  routes → rag.pipeline → retrieval → Gemini   │
│ (Firebase   │ HTTP │                                                │
│  Auth)      │◀─────│  HyDE → embed → hybrid(FAISS+BM25) → rerank    │
└─────────────┘ SSE  │       → confidence gate → generate → log       │
                     └───────────────┬──────────────┬─────────────────┘
                                     │              │
                              ┌──────▼─────┐  ┌─────▼──────┐
                              │  Supabase  │  │  Firebase  │
                              │ (Postgres) │  │   Admin    │
                              └────────────┘  └────────────┘
```

**Retrieval pipeline** (`backend/rag/pipeline.py`):

`HyDE expand → embed query → hybrid search (FAISS + BM25) → cross-encoder rerank
→ confidence gate → Gemini generate → log to Supabase → follow-up suggestions`

A per-process TTL cache short-circuits repeat queries; regenerations skip it.

---

## ✨ Features

- **Multi-format ingestion** — PDF, DOCX, TXT runbooks parsed and indexed
- **Section-aware chunking** — splits by headings with sliding-window fallback
- **Hybrid retrieval** — FAISS dense vectors (`BAAI/bge-small-en-v1.5`) **+** BM25 keyword search
- **HyDE query expansion** — generates a hypothetical answer to boost recall
- **Cross-encoder re-ranking** — `BAAI/bge-reranker-base` reorders by true relevance
- **Confidence gate** — refuses to answer below threshold, so no fabricated citations
- **6 answer modes** — `fast`, `standard`, `deep`, `eli5`, `expert`, `dryrun` ([details](#-answer-modes))
- **Streaming answers** — token-by-token over Server-Sent Events
- **Inline citations** — every step cites the runbook excerpt it came from
- **Personal + shared runbooks** — users upload private runbooks; admins manage the shared library
- **Feedback loop** — 👍/👎 ratings stored in PostgreSQL for quality tracking
- **Analytics** — runbook health and knowledge-gap detection in the admin panel
- **Bookmarks, query history, shareable answers, Markdown export**
- **Firebase Google Auth** — one-click sign-in with backend JWT verification
- **Rate limiting** — per-IP query throttling via slowapi

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Vector store** | FAISS (`faiss-cpu`) |
| **Keyword store** | BM25 (`rank-bm25`) |
| **Embeddings** | `BAAI/bge-small-en-v1.5` (sentence-transformers) |
| **Reranker** | `BAAI/bge-reranker-base` (cross-encoder) |
| **LLM** | Google Gemini (`gemini-2.5-flash`, with fallbacks) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Firebase (Google Sign-In) — Admin SDK on the backend |
| **Doc parsing** | PyMuPDF (PDF), python-docx (DOCX), langchain text splitters |
| **Rate limiting** | slowapi |
| **Frontend** | React 18, Vite, TailwindCSS, framer-motion, react-markdown, axios |
| **Deploy** | Docker + docker-compose |

---

## 📁 Project Structure

```
resolveit-ai/
├── backend/
│   ├── main.py                # FastAPI entry (lifespan: load FAISS, warm models, build BM25)
│   ├── core/                  # config, firebase_auth, supabase_client, gemini_client, rate_limit
│   ├── ingestion/             # parser, chunker, indexer
│   ├── retrieval/             # embedder, faiss_store, bm25_store, hybrid, reranker
│   ├── rag/                   # pipeline.py, modes.py
│   ├── routes/                # query, auth, admin, runbooks, bookmarks, history, feedback, exports
│   ├── models/                # Pydantic request/response models
│   ├── migrations/            # SQL migrations 001–006 (run in order)
│   ├── sample_runbooks/       # example runbooks to seed the index
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # Landing, Login, Register, Dashboard, AdminPanel, ...
│   │   ├── components/        # QueryInput, ResultCard, Sidebar, CommandPalette, ...
│   │   ├── hooks/             # useAuth, useQuery
│   │   ├── context/           # AuthContext
│   │   └── firebaseConfig.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Firebase project** with Google Auth enabled
- **Supabase project**
- **Google Gemini API key**

### 1. Clone

```bash
git clone <your-repo-url>
cd resolveit-ai
```

### 2. Supabase database

Run the SQL migrations in `backend/migrations/` (`001` → `006`) **in order** in the
Supabase SQL Editor. They create the `runbooks`, `query_logs`, `feedback`, and
`bookmarks` tables plus later columns (content hash, admin flag, thread id, mode).

> Auth is handled by Firebase, so `user_id` columns store Firebase UIDs as `TEXT`
> (no foreign key to `auth.users`).

### 3. Firebase

1. Open the [Firebase Console](https://console.firebase.google.com/) and create/select a project.
2. Enable **Authentication → Google** sign-in.
3. **Project Settings → Service Accounts → Generate New Private Key** → save as
   `backend/firebase-service-account.json`.
4. **Project Settings → General → Your apps → Web app** → copy the config into `frontend/.env`.

### 4. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # Windows (PowerShell)
# source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt
cp .env.example .env             # then fill in real values

uvicorn main:app --reload --port 8000
```

_(Optional)_ seed the index from the bundled sample runbooks:

```bash
python test_full_pipeline.py
```

### 5. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # then fill in real values
npm run dev
```

### 6. Open

- Frontend → http://localhost:5173
- Backend API docs → http://localhost:8000/docs

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Service-role key (backend only — keep secret) |
| `SUPABASE_ANON_KEY` | — | — | Optional |
| `GEMINI_API_KEY` | ✅* | — | Without it, generation returns placeholder text |
| `GEMINI_MODEL` | — | `gemini-2.5-flash` | Primary LLM |
| `GEMINI_FALLBACK_MODELS` | — | `gemini-2.0-flash,gemini-2.0-flash-lite` | Comma-separated |
| `FIREBASE_CREDENTIALS_PATH` | — | `./firebase-service-account.json` | Service-account JSON path |
| `FAISS_INDEX_PATH` | — | `./faiss_index` | Where the index is persisted |
| `EMBEDDING_MODEL` | — | `BAAI/bge-small-en-v1.5` | |
| `RERANKER_MODEL` | — | `BAAI/bge-reranker-base` | |
| `ADMIN_EMAILS` | — | — | Comma-separated; these users get admin access |
| `CORS_ORIGINS` | — | `http://localhost:5173,http://localhost:3000` | Comma-separated |
| `MAX_UPLOAD_MB` | — | `20` | Max runbook upload size |
| `QUERY_RATE_LIMIT` | — | `20/minute` | slowapi limit string |
| `QUERY_CACHE_SIZE` / `QUERY_CACHE_TTL_SECONDS` | — | `256` / `600` | Answer cache |

### `frontend/.env`

| Variable | Notes |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_API_BASE_URL` | Backend URL, e.g. `http://localhost:8000` |

---

## 🎚️ Answer Modes

The query API accepts a `mode` field that tunes retrieval depth and answer voice
(`backend/rag/modes.py`):

| Mode | HyDE | Candidates → kept | Style |
|------|------|-------------------|-------|
| `fast` | off | 6 → 3 | Terse, 3–5 steps |
| `standard` | on | 12 → 5 | Balanced default |
| `deep` | on | 20 → 8 | Adds Root Cause + Verification |
| `eli5` | on | 12 → 5 | Beginner-friendly, explains jargon |
| `expert` | on | 12 → 5 | Senior-SRE shorthand, commands only |
| `dryrun` | on | 12 → 5 | Annotated commands + Rollback section |

Every mode runs a **gate check** first — if no excerpt directly addresses the
question, the assistant replies _"No relevant information in the indexed runbooks —
please escalate to Tier-2."_ rather than inventing an answer.

---

## 📡 API Reference

Interactive docs at `GET /docs`. Authenticated routes expect a Firebase ID token
in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/health` | — | FAISS vector + metadata counts |
| `POST` | `/query` | Bearer | Run a RAG query (blocking) |
| `POST` | `/query/stream` | Bearer | Run a RAG query (SSE streaming) |
| `GET`  | `/answer/{query_log_id}` | Bearer | Fetch a past answer (shareable) |
| `GET`  | `/history` | Bearer | Current user's query history |
| `POST` | `/feedback` | Bearer | Submit 👍/👎 on an answer |
| `GET`  | `/export/{query_log_id}.md` | Bearer | Export an answer as Markdown |
| `POST` | `/runbooks/upload` | Bearer | Upload a personal runbook |
| `GET`  | `/runbooks/my` | Bearer | List personal runbooks |
| `DELETE` | `/runbooks/my/{id}` | Bearer | Delete a personal runbook |
| `POST`/`GET`/`DELETE` | `/bookmarks` · `/bookmarks/{id}` | Bearer | Manage bookmarks |
| `GET`/`POST` | `/auth/me` · `/auth/verify` | Bearer | Auth |
| `POST` | `/admin/upload` | Bearer (admin) | Upload a shared runbook |
| `GET`/`DELETE` | `/admin/runbooks` · `/admin/runbooks/{id}` | Bearer (admin) | Manage shared library |
| `GET`  | `/admin/feedback-stats` · `/admin/runbook-health` · `/admin/knowledge-gaps` | Bearer (admin) | Analytics |

---

## 🖥️ Frontend Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Landing | Public |
| `/login`, `/register` | Auth | Public |
| `/dashboard` | Ask questions, view answers | Protected |
| `/history` | Past queries | Protected |
| `/my-runbooks` | Upload / manage personal runbooks | Protected |
| `/playbook` | Saved / bookmarked answers | Protected |
| `/answer/:id` | Shared answer view | Protected |
| `/admin` | Admin panel (analytics, shared library) | Admin only |

---

## 🐳 Docker

```bash
docker compose up --build
```

- Backend → http://localhost:8000
- Frontend → http://localhost:5173

The compose file mounts `backend/.env`, the persisted `faiss_index/`, and the
Firebase service-account JSON into the backend container.

---

## 🧪 Testing

```bash
cd backend
pytest
```

Covers the parser, chunker, FAISS store, and reranker (`backend/tests/`).

---

## 🔒 Security Notes

- **Never commit** `backend/.env`, `backend/firebase-service-account.json`, or any
  Supabase service-role / Gemini key. The service-role key bypasses row-level security.
- CORS, upload size, and a per-IP query rate limit are enforced server-side.
- Only emails listed in `ADMIN_EMAILS` get admin privileges.

---

## 📝 Resume Bullet

```
ResolveIT AI – RAG-based IT Runbook Assistant | Python, FastAPI, FAISS, BM25, Gemini, React  2025
– Built a hybrid retrieval system (FAISS dense vectors + BM25) over multi-format runbooks
  (PDF/DOCX/TXT) with section-aware chunking, HyDE query expansion, and BGE cross-encoder
  re-ranking, plus a confidence gate that refuses low-relevance matches to prevent hallucination.
– Implemented an end-to-end, streaming RAG pipeline on Gemini 2.5 Flash with six answer modes,
  inline source citations, follow-up suggestions, and a TTL answer cache.
– Shipped a full-stack React/Tailwind app with Firebase Google auth, Supabase PostgreSQL,
  per-user runbook uploads, query audit logging, bookmarks, and admin analytics
  (feedback stats, runbook health, knowledge-gap detection).
```

---

*Built by Mariyala Abhinav Teja — Full-Stack AI/ML Project*
