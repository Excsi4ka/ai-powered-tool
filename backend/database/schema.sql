CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY,
    job_title VARCHAR(255),
    company VARCHAR(255),
    resume_filename VARCHAR(255),
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at
    ON analyses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_match_score
    ON analyses (match_score);
