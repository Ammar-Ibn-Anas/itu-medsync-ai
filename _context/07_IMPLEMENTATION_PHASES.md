# 07 — Implementation Phases

## How to Use This With AI Agents

Before every AI agent session, paste the relevant context files. Use this template:

```
I am building MedSync AI. Read these context files first:
[paste 00_project_overview.md]
[paste 01_tech_stack.md]
[paste relevant other files]

CRITICAL: Use snake_case for all file names, variables, functions, and state.
Only exception: React component function names must be PascalCase (React requirement).

Current phase: [phase name]
What already exists: [list what's done]
What I need you to build: [specific task]
```

Never ask an agent to "build the whole project." One feature at a time.

---

## Phase 0 — Infrastructure (Day 1, ~2 hours)

**Goal:** Everything connected, nothing broken.

1. Create Supabase project. Run SQL from `02_database_schema.md`. Note all keys.
2. Get Gemini API key from aistudio.google.com
3. Create GitHub repo `medsync-ai` with the folder structure from `00_project_overview.md`
4. Backend: `pip install -r requirements.txt`, fill `.env`, run `uvicorn main:app --reload` → confirm `/docs` loads
5. Frontend: `npm install`, fill `.env`, run `npm run dev` → confirm it loads
6. Test script: write 10 lines of Python that calls `gemini.embed_text("hello world")` and prints the vector length (should be 768)

**Done when:** Both servers run locally. Gemini key confirmed returning 768-dim vectors.

---

## Phase 1 — Backend Core (Days 1–3, ~8 hours)

Build in this order. Test each via `/docs` before moving on.

### 1a — DB client
`project/backend/app/db/client.py`
- `get_db()` returns Supabase client singleton
- Test: insert and read a test row

### 1b — Auth
`project/backend/app/routers/auth.py`
- `POST /api/v1/auth/login` — Supabase Auth sign in, return JWT
- `GET /api/v1/auth/me` — decode and return user
- `get_current_admin` dependency used by all protected routes

### 1c — Categories
`project/backend/app/routers/categories.py`
- Full CRUD

### 1d — Document Upload + Ingestion
`project/backend/app/routers/admin_documents.py`
`project/backend/app/services/document_service.py`
- Upload endpoint: accept multipart, store to Supabase Storage, create DB row, kick off background task
- Ingestion: pdfplumber extract → LangChain chunk → Gemini embed → insert chunks
- Test: upload a PDF, wait 60s, query `document_chunks` in Supabase → should have rows with embeddings

### 1e — Document CRUD
- GET list (with filters), GET single, PUT, DELETE, PATCH publish, POST reindex

### 1f — Trusted Sources CRUD

**Done when:** Can upload a PDF via `/docs` and see `status=indexed` and rows in `document_chunks`.

---

## Phase 2 — AI Audit Engine (Days 3–5, ~6 hours)

### 2a — Gemini service
`project/backend/app/services/gemini_service.py`
- Implement exactly as in `05_ai_engine.md`
- Quick test: call `audit_chunk_web_grounded("The standard paediatric fever threshold is 37.5°C")` → should return a finding

### 2b — Audit service
`project/backend/app/services/audit_service.py`
- Full orchestration as described in `05_ai_engine.md`
- Runs as BackgroundTask

### 2c — Audit routes
`project/backend/app/routers/audit.py`
- POST run, GET single (for polling), GET document history, GET list

### 2d — Notifications routes
`project/backend/app/routers/notifications.py`

**Done when:** POST to `/api/v1/admin/audit/run`, poll every 3s, see `status=completed` with findings JSON.

---

## Phase 3 — Student Search (Day 5, ~2 hours)

`project/backend/app/routers/student.py`

- Embed query → call `search_knowledge_base` RPC → return results
- Test: publish a document, call `GET /api/v1/student/search?q=fever` → should return ranked chunks

**Done when:** Semantic search returns relevant results for a plain English query.

---

## Phase 4 — Admin Frontend (Days 6–10, ~15 hours)

Build in this order:

1. **Project setup:** Vite + React Router + Tailwind + shadcn/ui. All routes with placeholder pages.
2. **API client:** `services/api_client.js` — Axios with base URL + auth interceptor
3. **Auth:** login page, JWT in localStorage, `admin_store.js`, `protected_route.jsx`
4. **Dashboard home:** stat cards, recent activity
5. **Document list:** table with filters, published toggle
6. **Upload page:** dropzone, metadata form, polling for `status=indexed`
7. **Document detail:** 3 tabs, edit form, run audit flow with polling, inline results
8. **Full audit report page:** findings list, filters, export
9. **Categories page:** CRUD inline table
10. **Trusted sources page:** CRUD table
11. **Notifications:** bell badge, drawer, mark read

**Done when:** Admin can log in, upload a PDF, run an audit, see a full Delta Report.

---

## Phase 5 — Student Frontend (Days 10–12, ~8 hours)

1. **Home:** hero, debounced search bar, category filters, result cards, recently updated grid
2. **Document reader:** chunk-based content, clean typography, bookmark button, last verified badge
3. **Bookmarks:** `student_store.js`, localStorage hydration, bookmark drawer in nav

**Done when:** Student can search, read, and bookmark — no login required.

---

## Phase 6 — Polish + Deploy (Days 12–14, ~4 hours)

1. Error boundaries and empty states everywhere
2. Loading skeletons on heavy pages
3. Mobile responsive check
4. Deploy backend to Railway
5. Deploy frontend to GitHub Pages via GitHub Actions
6. Full end-to-end test on production URLs
7. Update `link_to_website.md`
8. Record demo video as backup for presentation

---

## Total: 12–14 days focused, or 4–6 weeks at student pace
