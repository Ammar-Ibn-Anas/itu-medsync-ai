-- ============================================
-- MedSync AI — Database Migrations
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================

-- 1. Enable pgvector extension (if not already)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Admin users table (for simple email+password auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure documents table exists with all needed columns
-- (If documents already exists, the ALTER TABLE statements below will add missing columns)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'study_note',
  file_url TEXT,
  status TEXT DEFAULT 'PROCESSING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to documents (IF NOT EXISTS guards against errors if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='category_id') THEN
    ALTER TABLE documents ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='reference_links') THEN
    ALTER TABLE documents ADD COLUMN reference_links JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='drift_status') THEN
    ALTER TABLE documents ADD COLUMN drift_status TEXT DEFAULT 'OK';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='summary') THEN
    ALTER TABLE documents ADD COLUMN summary TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='auto_summary_enabled') THEN
    ALTER TABLE documents ADD COLUMN auto_summary_enabled BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_storage_path') THEN
    ALTER TABLE documents ADD COLUMN file_storage_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='updated_at') THEN
    ALTER TABLE documents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='drift_report') THEN
    ALTER TABLE documents ADD COLUMN drift_report JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='last_audited_at') THEN
    ALTER TABLE documents ADD COLUMN last_audited_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_bytes') THEN
    ALTER TABLE documents ADD COLUMN file_bytes BYTEA;
  END IF;
END $$;

-- 5. Ensure document_chunks table exists
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'DRIFT_DETECTED',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit reports table (may already exist)
CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_note_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  trusted_source_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  findings JSONB,
  contradiction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RPC function for vector similarity search (may already exist, replace)
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(768),
  doc_type_filter TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  doc_title TEXT,
  distance FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    d.title AS doc_title,
    (dc.embedding <=> query_embedding)::FLOAT AS distance
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.doc_type = doc_type_filter
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 9. RPC function for searching across ALL doc types (for student portal)
CREATE OR REPLACE FUNCTION search_all_documents(
  query_embedding vector(768),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  doc_title TEXT,
  category_name TEXT,
  distance FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    d.title AS doc_title,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    (dc.embedding <=> query_embedding)::FLOAT AS distance
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  LEFT JOIN categories c ON c.id = d.category_id
  WHERE dc.embedding IS NOT NULL
    AND d.status = 'INDEXED'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 10. Disable RLS on all tables for anon key access
-- (Since we're using anon key and handling auth in the app layer)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon key
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['categories','admin_users','documents','document_chunks','notifications','audit_reports'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Done! Your database is ready.
-- Next: Insert an admin user using the /api/auth/setup endpoint.
