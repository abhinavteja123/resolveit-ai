-- ============================================================================
-- ResolveIT AI — Database Migration 001
-- Creates all required tables in Supabase PostgreSQL.
--
-- NOTE: This project uses Firebase for authentication (Google Sign-In),
--       NOT Supabase Auth. Therefore user_id columns store Firebase UIDs
--       as TEXT, with no foreign-key reference to auth.users.
-- ============================================================================

-- ── Runbooks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runbooks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename       TEXT NOT NULL,
    title          TEXT,
    category       TEXT CHECK (category IN ('network', 'server', 'application', 'other')),
    file_type      TEXT CHECK (file_type IN ('pdf', 'docx', 'txt')),
    uploaded_by    TEXT NOT NULL,                   -- Firebase UID
    uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
    chunk_count    INTEGER DEFAULT 0,
    is_indexed     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_runbooks_category ON runbooks(category);
CREATE INDEX IF NOT EXISTS idx_runbooks_uploaded_by ON runbooks(uploaded_by);

-- ── Query Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT NOT NULL,                -- Firebase UID
    query_text        TEXT NOT NULL,
    retrieved_sources TEXT[],                       -- array of source filenames
    llm_response      TEXT,
    confidence_score  FLOAT,
    queried_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_queried_at ON query_logs(queried_at DESC);

-- ── Feedback ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_log_id   UUID REFERENCES query_logs(id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL,                   -- Firebase UID
    rating         INTEGER CHECK (rating IN (1, -1)),
    comment        TEXT,
    submitted_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_query_log_id ON feedback(query_log_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);

-- ── Row Level Security (optional — disable for service-role access) ─────────
-- RLS is disabled by default so the service-role key can operate freely.
-- Enable and add policies if you need per-user row-level restrictions.

ALTER TABLE runbooks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback   ENABLE ROW LEVEL SECURITY;

-- Allow service-role (used by backend) full access
CREATE POLICY "Service role full access on runbooks"   ON runbooks   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on query_logs" ON query_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on feedback"   ON feedback   FOR ALL USING (true) WITH CHECK (true);
