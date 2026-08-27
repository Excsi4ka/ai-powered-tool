CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY,
    job_title VARCHAR(255),
    company VARCHAR(255),
    job_url VARCHAR(2048),
    resume_filename VARCHAR(255),
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analyses
    ADD COLUMN IF NOT EXISTS job_url VARCHAR(2048);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at
    ON analyses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_match_score
    ON analyses (match_score);

CREATE INDEX IF NOT EXISTS idx_analyses_job_url
    ON analyses (job_url);
