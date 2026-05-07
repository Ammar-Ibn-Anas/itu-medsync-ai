-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Metadata Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    doc_type TEXT CHECK (doc_type IN ('study_note', 'trusted_source')),
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'PROCESSING'
);

-- Semantic Chunks Table
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(768) -- Vector size for Gemini embedding-004
);

-- HNSW Index for fast ANN Search (Optimization)
CREATE INDEX ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Audit Reports Table
CREATE TABLE audit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_note_id UUID REFERENCES documents(id),
    trusted_source_id UUID REFERENCES documents(id),
    findings JSONB, -- Stores the "Contradiction", "Missing", "Aligned" logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
