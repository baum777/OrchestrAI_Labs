BEGIN;

ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS commit_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS commit_token_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commit_token_issued_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_review_requests_commit_token_hash
  ON review_requests (commit_token_hash);

COMMIT;

