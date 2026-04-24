-- Adds is_admin_runbook flag to distinguish admin-uploaded runbooks from user-uploaded ones.
ALTER TABLE runbooks
  ADD COLUMN IF NOT EXISTS is_admin_runbook BOOLEAN DEFAULT FALSE;

-- Back-fill: any runbook uploaded before this migration is treated as admin-owned.
UPDATE runbooks SET is_admin_runbook = TRUE WHERE is_admin_runbook IS NULL OR is_admin_runbook = FALSE;

CREATE TABLE bookmarks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
    query_log_id   UUID REFERENCES query_logs(id),
    query_text     TEXT,
    answer_snippet TEXT,
    sources        TEXT[],
    bookmarked_at  TIMESTAMPTZ DEFAULT NOW()
  );