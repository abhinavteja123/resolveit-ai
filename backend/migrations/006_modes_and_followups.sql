-- Migration 006: Add `mode` and `regenerate_of` to query_logs.
-- `mode` records which response mode (fast / standard / deep / eli5 / expert /
-- dryrun) produced the answer.
-- `regenerate_of` lets a regenerated answer point back at the original log row,
-- so the UI can group "tried again" attempts under the same question.

ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS mode TEXT;

ALTER TABLE query_logs
  ADD COLUMN IF NOT EXISTS regenerate_of UUID
  REFERENCES query_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_query_logs_regenerate_of ON query_logs(regenerate_of);
CREATE INDEX IF NOT EXISTS idx_query_logs_mode ON query_logs(mode);
