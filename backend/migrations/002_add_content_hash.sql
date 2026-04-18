-- Adds content-hash deduplication to runbooks table.
ALTER TABLE runbooks
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_runbooks_content_hash
  ON runbooks(content_hash)
  WHERE content_hash IS NOT NULL;
