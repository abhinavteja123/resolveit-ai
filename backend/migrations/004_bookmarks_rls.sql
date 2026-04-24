-- Migration 004: Create bookmarks table, enable RLS, add access policy.
-- The bookmarks table was missing from migration 001 — causing 404 from Supabase.

CREATE TABLE IF NOT EXISTS bookmarks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,                              -- Firebase UID
    query_log_id   UUID REFERENCES query_logs(id) ON DELETE CASCADE,
    query_text     TEXT NOT NULL,
    answer_snippet TEXT,
    sources        TEXT[],
    bookmarked_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_query_log_id ON bookmarks(query_log_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on bookmarks" ON bookmarks;

CREATE POLICY "Service role full access on bookmarks"
  ON bookmarks FOR ALL USING (true) WITH CHECK (true);
