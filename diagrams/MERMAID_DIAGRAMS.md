# ResolveIT AI — Mermaid Diagrams (paste into draw.io)

> In draw.io: **Arrange → Insert → Advanced → Mermaid…** then paste each block.
> All diagrams render fine without colours; tweak fonts/positions inside draw.io after insertion.

---

## Diagram 1 — High-Level System Architecture

```mermaid
flowchart TB
    subgraph CLIENT["CLIENT LAYER"]
        Browser["Browser<br/>React 18 + Vite SPA"]
        Auth["AuthContext<br/>Firebase ID Token<br/>auto-refresh 50 min"]
        Hook["useQuery hook<br/>fetch SSE<br/>AbortController"]
        Pages["Pages<br/>Dashboard · Admin · History<br/>Playbook · Runbooks · Shared"]
    end

    subgraph API["API LAYER (FastAPI 0.115)"]
        RQ["/query · /query/stream<br/>SSE: mode → sources → token → done"]
        RA["/auth/me · /auth/verify"]
        RAD["/admin/upload · runbook-health<br/>knowledge-gaps · feedback-stats"]
        REX["/export/{id}.md"]
        RM["/feedback · /history<br/>/bookmarks · /runbooks"]
        MID["Middleware: SlowAPI · CORS · Firebase JWT verify · TTLCache (mode-keyed)"]
    end

    subgraph SVC["SERVICE LAYER"]
        RAG["RAG Pipeline<br/>rag/pipeline.py<br/>HyDE → Hybrid → Rerank<br/>→ Gate → LLM"]
        MODES["Modes Pack<br/>rag/modes.py<br/>6 ModeConfigs + Prompts"]
        ING["Ingestion<br/>parser · chunker<br/>· indexer (SHA-256)"]
        RET["Retrieval<br/>Embedder · FAISS · BM25<br/>· Reranker · Hybrid (RRF)"]
        FU["Follow-up Generator<br/>Gemini · 3 questions"]
    end

    subgraph DATA["DATA & EXTERNAL SERVICES"]
        SUPA[("Supabase PostgreSQL<br/>runbooks · query_logs<br/>feedback · bookmarks")]
        FAISS[("FAISS index.bin<br/>+ metadata.json<br/>disk volume")]
        FB["Firebase Auth<br/>OAuth + JWT"]
        GEM["Google Gemini 2.5 Flash<br/>google-genai SDK<br/>fallback model list"]
        HF["Hugging Face<br/>BGE-small + reranker-base"]
    end

    Browser --> Pages
    Pages --> Hook
    Pages --> Auth
    Hook -->|"HTTPS · Bearer JWT"| RQ
    Auth --> RA
    Hook --> REX
    Pages --> RAD
    Pages --> RM

    RQ --> MID
    RA --> MID
    RAD --> MID
    REX --> MID
    RM --> MID

    MID --> RAG
    RAG --> MODES
    RAG --> RET
    RAG --> FU
    RAG --> SUPA
    RET --> FAISS
    RET -.-> HF
    ING --> FAISS
    ING --> SUPA
    RAG --> GEM
    FU --> GEM
    MID --> FB
```

---

## Diagram 2 — Component Interaction (React ↔ FastAPI ↔ Services)

```mermaid
flowchart LR
    subgraph FE["FRONTEND (frontend/src)"]
        DASH["Dashboard.jsx<br/>messages array<br/>mode/scope chips<br/>regenerate · follow-up"]
        RC["ResultCard.jsx<br/>wizard / raw<br/>copy/share/bookmark/<br/>export/regen · follow-ups"]
        QI["QueryInput.jsx"]
        CP["CommandPalette.jsx<br/>Cmd+K"]
        AP["AdminPanel.jsx<br/>RunbookHealthGrid<br/>Knowledge Gaps"]
        HIST["QueryHistory.jsx"]
        PB["MyPlaybook.jsx"]
        MR["MyRunbooks.jsx"]
        UQ["useQuery() hook<br/>submitQueryStream({mode,scope,threadId,regenerateOf})<br/>reads SSE: mode · sources · token · done"]
        AC["AuthContext.jsx<br/>{user, token, isAdmin}<br/>Firebase auto-refresh 50min"]
        AX["Axios + fetch<br/>Authorization: Bearer ID Token"]
    end

    subgraph BE["BACKEND (backend/)"]
        RQ["routes/query.py<br/>POST /query · /query/stream<br/>GET /answer/{id}"]
        REX["routes/exports.py<br/>GET /export/{id}.md"]
        RAD["routes/admin.py<br/>upload · runbook-health<br/>knowledge-gaps · feedback-stats"]
        RM["routes/auth · feedback · history<br/>runbooks · bookmarks"]
        MID["Middleware: SlowAPI · CORS · firebase_auth.verify_id_token · TTLCache"]
        PIPE["rag/pipeline.py<br/>run_rag_pipeline · stream_rag_pipeline"]
        MODES["rag/modes.py<br/>ModeConfig + 6 prompts"]
        GC["core/gemini_client.py<br/>hyde_expand · generate_resolution<br/>stream_resolution · generate_followups"]
        RET["retrieval/<br/>embedder · faiss_store · bm25_store<br/>reranker · hybrid (RRF)"]
        ING["ingestion/<br/>parser · chunker · indexer"]
        SUPA_C["core/supabase_client.py"]
        FBA["core/firebase_auth.py"]
    end

    DASH --> UQ
    RC --> UQ
    QI --> DASH
    CP --> DASH
    AP --> AX
    HIST --> AX
    PB --> AX
    MR --> AX
    MR -.->|upload| ING
    UQ --> AX
    AC --> AX
    AX -->|"HTTPS · Bearer JWT"| MID

    MID --> RQ
    MID --> REX
    MID --> RAD
    MID --> RM
    RQ --> PIPE
    PIPE --> MODES
    PIPE --> GC
    PIPE --> RET
    PIPE --> SUPA_C
    ING --> RET
    MID --> FBA
```

---

## Diagram 3 — RAG Pipeline Flow

```mermaid
flowchart LR
    Q([Query]) --> M[get_mode]
    M --> CC{Cache?}
    CC -->|hit| OUT([Answer])
    CC -->|miss| H[HyDE]
    H --> E[Embed]
    E --> HY[Hybrid<br/>FAISS+BM25<br/>RRF]
    HY --> R[Re-rank]
    R --> G{score<br/>≥ 0.25?}
    G -->|no| ESC[Escalate]
    G -->|yes| L[Gemini]
    L --> F[Follow-ups]
    L --> LG[Log + Cache]
    F --> OUT
    LG --> OUT
    ESC --> OUT
```

---

## Diagram 4 — Mode Selection & Pipeline Branching

```mermaid
flowchart TD
    UI["Frontend mode chips (Dashboard.jsx)<br/>Fast · Standard · Deep · ELI5 · Expert · Dry-run"]
    UI --> PAY["QueryRequest<br/>{query, scope, thread_id,<br/>mode, regenerate_of}"]
    PAY --> GM["get_mode(name) → ModeConfig<br/>name · use_hyde · top_k · top_n<br/>temperature · system_prompt · critique_retry<br/>(unknown / None → fallback to standard)"]

    GM --> FAST["FAST<br/>use_hyde=False<br/>top_k=6, top_n=3<br/>temp=0.0<br/>Prompt: Be terse"]
    GM --> STD["STANDARD<br/>use_hyde=True<br/>top_k=12, top_n=5<br/>temp=0.2<br/>Default prompt"]
    GM --> DEEP["DEEP<br/>use_hyde=True<br/>top_k=20, top_n=8<br/>temp=0.2<br/>critique_retry=True<br/>Adds Root Cause + Verification"]
    GM --> ELI5["ELI5<br/>use_hyde=True<br/>top_k=12, top_n=5<br/>temp=0.3<br/>Beginner prompt<br/>explains jargon"]
    GM --> EXP["EXPERT<br/>use_hyde=True<br/>top_k=12, top_n=5<br/>temp=0.1<br/>TL;DR + cmd-only steps"]
    GM --> DRY["DRY-RUN<br/>use_hyde=True<br/>top_k=12, top_n=5<br/>temp=0.1<br/>Annotates cmds + Rollback section"]

    FAST --> PIPE
    STD --> PIPE
    DEEP --> PIPE
    ELI5 --> PIPE
    EXP --> PIPE
    DRY --> PIPE
    PIPE["rag/pipeline.py — single pipeline, branched configuration<br/>Cache key includes mode → independent caching per mode"]
    PIPE --> RES["QueryResponse + SSE done<br/>{answer, sources, top_confidence,<br/>mode, follow_ups, query_log_id, cached}"]
```

---

## Diagram 5 — Streaming SSE Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React UI<br/>(Dashboard)
    participant Hook as useQuery hook
    participant API as FastAPI<br/>/query/stream
    participant Pipe as RAG pipeline<br/>stream_rag_pipeline
    participant Gem as Gemini API

    User->>UI: types query, picks mode
    UI->>Hook: submitQueryStream({query,scope,mode,threadId})
    Hook->>API: POST /query/stream (Bearer JWT)
    API->>API: verify JWT (firebase_admin)
    API->>Pipe: stream_rag_pipeline(query,user,scope,mode,...)
    Pipe-->>Hook: event mode  data {"mode":"deep"}
    Pipe->>Gem: hyde_expand(query)
    Gem-->>Pipe: hypothetical passage
    Pipe->>Pipe: embed → FAISS+BM25 → RRF → rerank → gate
    Pipe-->>Hook: event sources  data [{filename,section,excerpt}]
    Hook-->>UI: render source badges

    loop for each token from Gemini
        Pipe->>Gem: generate_content_stream(prompt,temp)
        Gem-->>Pipe: token chunk
        Pipe-->>Hook: event token  data "Step 1..."
        Hook-->>UI: append streaming text
    end

    Pipe->>Gem: generate_followups()
    Gem-->>Pipe: 3 follow-up questions
    Pipe->>Pipe: log to query_logs (mode, regenerate_of), TTLCache.set
    Pipe-->>Hook: event done  data {query_log_id, top_confidence, mode, follow_ups}
    Hook-->>UI: setResult render answer + chips
    UI-->>User: cited answer + follow-up chips
```

---

## Diagram 6 — Database ER

```mermaid
erDiagram
    runbooks ||--o{ query_logs : "logs hits via filename"
    query_logs ||--o{ feedback : "rates"
    query_logs ||--o{ bookmarks : "bookmarks"
    query_logs ||--o{ query_logs : "thread_id (self FK)"
    query_logs ||--o{ query_logs : "regenerate_of (self FK)"

    runbooks {
        UUID id PK
        TEXT filename "NOT NULL"
        TEXT title
        TEXT category "server|network|application|other"
        TEXT file_type "pdf|docx|txt"
        TEXT uploaded_by "Firebase UID"
        TIMESTAMPTZ uploaded_at
        INTEGER chunk_count
        BOOLEAN is_indexed
        TEXT content_hash "SHA-256 dedup"
        BOOLEAN is_admin_runbook
    }

    query_logs {
        UUID id PK
        TEXT user_id "Firebase UID"
        TEXT query_text "NOT NULL"
        TEXT_ARRAY retrieved_sources
        TEXT llm_response
        FLOAT confidence_score
        TIMESTAMPTZ queried_at
        UUID thread_id FK "self FK · migration 005"
        TEXT mode "migration 006"
        UUID regenerate_of FK "self FK · migration 006"
    }

    feedback {
        UUID id PK
        UUID query_log_id FK
        TEXT user_id
        INTEGER rating "1 or -1"
        TEXT comment
        TIMESTAMPTZ submitted_at
    }

    bookmarks {
        UUID id PK
        TEXT user_id
        UUID query_log_id FK
        TEXT query_text
        TEXT answer_snippet
        TEXT_ARRAY sources
        TIMESTAMPTZ bookmarked_at
    }
```

---

## Diagram 7 — Authentication Flow

```mermaid
flowchart LR
    U([User]) --> L[Login.jsx]
    L --> S[Firebase SDK]
    S --> FB[Firebase Auth]
    FB -.-> T[ID Token JWT]
    T --> AC[AuthContext]
    AC --> FE[fetch + Bearer]
    FE --> API[FastAPI]
    API --> V[verify_id_token]
    V -->|fail| E[HTTP 401]
    V -->|ok| ADM{Admin email?}
    ADM --> OK[user dict<br/>+ is_admin]
    OK --> P([Route handler])
```

---

## Diagram 8 — Deployment Topology

```mermaid
flowchart LR
    BR([Browser])
    subgraph DC[Docker Compose]
        FE[frontend<br/>nginx :5173]
        BE[backend<br/>FastAPI :8000]
        V[(FAISS volume)]
    end
    SUPA[(Supabase)]
    FB[Firebase Auth]
    GEM[Gemini API]

    BR --> FE
    BR --> BE
    BE --> V
    BE --> SUPA
    BE --> FB
    BE --> GEM
```

---

## How to use these in draw.io

1. Open **draw.io desktop** or **app.diagrams.net**.
2. **Arrange → Insert → Advanced → Mermaid…**
3. Paste a single fenced-block (the code between the ` ```mermaid ` markers, **not including** the markers).
4. Click **Insert** — draw.io renders editable shapes.
5. Re-arrange / restyle (font, alignment) as needed.
6. **File → Export As → PNG** (or SVG) to drop into the DOCX placeholders.

> draw.io supports `flowchart`, `sequenceDiagram`, and `erDiagram` in its built-in Mermaid importer. All 8 diagrams above use these supported types only.
