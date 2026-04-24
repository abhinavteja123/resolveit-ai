-- Migration 005: Add thread_id to query_logs for chat continuation threading.
-- Continued queries reference the original root query's ID via thread_id.
-- Root queries (fresh chats) have thread_id = NULL.

ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES query_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_query_logs_thread_id ON query_logs(thread_id);
