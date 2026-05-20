# 02 — Database Schema

Run all of this in the Supabase SQL Editor in one go.

---

```sql
-- ─── Enable pgvector ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── categories ─────────────────────────────────────────────
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    color       TEXT DEFAULT '#6366f1',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── documents ──────────────────────────────────────────────
CREATE TABLE documents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    description       TEXT,
    category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    doc_type          TEXT NOT NULL CHECK (doc_type IN ('study_note', 'trusted_source')),
    file_url          TEXT,
    raw_text          TEXT,
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    last_audited_at   TIMESTAMPTZ,
    last_verified_at  TIMESTAMPTZ,
    is_published      BOOLEAN DEFAULT FALSE,
    uploaded_by       UUID,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── document_chunks ────────────────────────────────────────
CREATE TABLE document_chunks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index   INTEGER NOT NULL,
    chunk_text    TEXT NOT NULL,
    embedding     vector(768),
    token_count   INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbour search
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- ─── trusted_sources ────────────────────────────────────────
CREATE TABLE trusted_sources (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    url                 TEXT NOT NULL UNIQUE,
    organisation        TEXT,
    topic_tags          TEXT[],
    last_fetched_at     TIMESTAMPTZ,
    last_content_hash   TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── audit_reports ──────────────────────────────────────────
CREATE TABLE audit_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id             UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    triggered_by            UUID,
    status                  TEXT NOT NULL DEFAULT 'running'
                                CHECK (status IN ('running', 'completed', 'failed')),
    contradiction_count     INTEGER DEFAULT 0,
    missing_context_count   INTEGER DEFAULT 0,
    aligned_count           INTEGER DEFAULT 0,
    total_chunks_audited    INTEGER DEFAULT 0,
    summary_text            TEXT,
    findings                JSONB,
    sources_used            JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

-- ─── notifications ──────────────────────────────────────────
CREATE TABLE notifications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    body                    TEXT NOT NULL,
    type                    TEXT NOT NULL
                                CHECK (type IN ('audit_complete', 'critical_drift', 'upload_failed', 'info')),
    related_document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
    related_audit_id        UUID REFERENCES audit_reports(id) ON DELETE SET NULL,
    is_read                 BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RPC: match_chunks ──────────────────────────────────────
-- Used by audit engine: find top-N similar chunks within a specific document
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding     vector(768),
    source_doc_id       UUID,
    match_count         INT DEFAULT 3,
    similarity_threshold FLOAT DEFAULT 0.60
)
RETURNS TABLE(id UUID, chunk_text TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.chunk_text,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.document_id = source_doc_id
      AND 1 - (dc.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END; $$;

-- ─── RPC: search_knowledge_base ─────────────────────────────
-- Used by student search: find top-N similar chunks across all published docs
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding     vector(768),
    doc_type_filter     TEXT DEFAULT 'study_note',
    match_count         INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.55
)
RETURNS TABLE(
    chunk_id            UUID,
    document_id         UUID,
    document_title      TEXT,
    chunk_text          TEXT,
    category_name       TEXT,
    last_verified_at    TIMESTAMPTZ,
    similarity          FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id               AS chunk_id,
        d.id                AS document_id,
        d.title             AS document_title,
        dc.chunk_text,
        c.name              AS category_name,
        d.last_verified_at,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.doc_type = doc_type_filter
      AND d.is_published = TRUE
      AND d.status = 'indexed'
      AND 1 - (dc.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END; $$;

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_sources ENABLE ROW LEVEL SECURITY;

-- Public read on published documents (student portal)
CREATE POLICY "public_read_published_documents"
    ON documents FOR SELECT USING (is_published = TRUE);

CREATE POLICY "public_read_categories"
    ON categories FOR SELECT USING (TRUE);

CREATE POLICY "public_read_published_chunks"
    ON document_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_id AND d.is_published = TRUE
        )
    );
-- All other operations go through the backend using SUPABASE_SERVICE_KEY
-- which bypasses RLS entirely.
```

---

## findings JSONB Structure

Each element in the `findings` array inside `audit_reports`:

```json
{
  "chunk_id": "uuid",
  "chunk_text": "The recommended dose for paediatric fever is 10mg/kg...",
  "status": "Contradiction",
  "explanation": "The note recommends 10mg/kg but current WHO guidance specifies 15mg/kg.",
  "specific_change": "dose: 10mg/kg → 15mg/kg",
  "evidence_snippet": "WHO recommends 15mg/kg per dose...",
  "evidence_source": "https://www.who.int/..."
}
```
