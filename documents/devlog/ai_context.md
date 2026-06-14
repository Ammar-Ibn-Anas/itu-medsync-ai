HI AI, USE THIS TO WRITE YOUR CONTEXT

// THIS LINE BELOW IS YOURS

# MedSync AI — Progress Log

## What Was Done (This Session)

### Backend Changes
- **`backend/ai_service.py`** — FULLY REWRITTEN. Gemini is gone. Now uses Ollama at `http://localhost:11434`.
  - `get_embedding()` → calls `/api/embeddings` with `nomic-embed-text`
  - `run_audit_comparison()` → calls `/api/generate` with `llama3.2:3b` at temperature 0
  - Added JSON parsing with markdown fence stripping (local LLMs sometimes wrap in ```json```)
  - Added fallback dict if the LLM response is unparseable (prevents 500 errors during demo)

- **`backend/main.py`** — UPDATED with:
  - New endpoint `POST /api/documents/upload-url` — ingests from a URL (auto-detects PDF vs webpage)
  - New endpoint `GET /api/documents` — lists all docs (used by frontend dropdowns)
  - Shared `_process_and_store()` helper so upload and upload-url share the same chunking/embedding logic
  - Audit now only processes first 5 chunks per document (MVP speed — prevents 10-minute demo wait)
  - Better error handling with proper HTTP status codes

- **`backend/requirements.txt`** — Removed `google-generativeai`. No other changes.

### Frontend — New Files Created
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/index.html`
- `frontend/src/main.jsx`
- `frontend/src/index.css`
- `frontend/src/App.jsx` — tab layout: Admin Dashboard / Student Portal
- `frontend/src/AdminDashboard.jsx` — upload (file + URL toggle), audit with color-coded findings, docs table
- `frontend/src/StudentPortal.jsx` — semantic search, results, localStorage bookmarks

### Documentation
- `README.md` — full project README with setup instructions, architectural trade-off section, demo guide

---

## Features Working (After Setup)
- ✅ PDF upload → text extraction → chunking → Ollama embedding → Supabase storage
- ✅ URL ingestion (PDF links and webpage articles)
- ✅ Knowledge Drift Audit — color-coded: 🔴 Contradiction / 🟡 Missing Context / 🟢 Aligned
- ✅ Document list with auto-populated dropdowns for audit
- ✅ Semantic student search with relevance scores
- ✅ Bookmark saving/removal via localStorage (no login needed)

---

## What You (Lead Dev) Still Need To Do

1. **Run `pip install -r backend/requirements.txt`** — make sure `requests` and `langchain-text-splitters` are installed.

2. **Create `.env` in `/backend/`** with:
   ```
   SUPABASE_URL=your_url_here
   SUPABASE_KEY=your_key_here
   ```
   (No GEMINI_API_KEY needed anymore)

3. **Supabase DB must have these tables:**
   - `documents` — id, title, doc_type, file_url, status, created_at
   - `document_chunks` — id, document_id, chunk_text, embedding (vector 768)
   - `audit_reports` — id, study_note_id, trusted_source_id, findings (jsonb), contradiction_count
   - `search_knowledge_base` RPC function (vector similarity search)
   
   If schema is already set up from before, it will just work.

4. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **For the demo:** Upload the dermatology PDF as `trusted_source`, and the outdated student note as `study_note`. The audit will find the Permethrin vs Ivermectin contradiction automatically.

6. **Optional nice-to-have:** Add a `.env.example` file in backend with empty keys so the repo is clean.

---

## Known Limitations (Acceptable for MVP)
- Audit only checks first 5 chunks per document (intentional — speed during demo)
- URL ingestion may fail on sites with aggressive bot protection (graceful error shown)
- No authentication on any backend endpoint (fine for local demo)
- Student bookmarks are per-browser only (by design for MVP)

