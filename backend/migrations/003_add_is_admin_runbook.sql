-- Adds is_admin_runbook flag to distinguish admin-uploaded runbooks from user-uploaded ones.
ALTER TABLE runbooks
  ADD COLUMN IF NOT EXISTS is_admin_runbook BOOLEAN DEFAULT FALSE;

-- Back-fill: any runbook uploaded before this migration is treated as admin-owned.
UPDATE runbooks SET is_admin_runbook = TRUE WHERE is_admin_runbook IS NULL OR is_admin_runbook = FALSE;
