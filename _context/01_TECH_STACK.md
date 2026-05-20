# 01 — Technology Stack

## Frontend

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool / dev server |
| React Router v6 | Client-side routing |
| Tailwind CSS 3 | Utility-first styling |
| shadcn/ui | Accessible component primitives |
| Zustand 4 | Global state management |
| TanStack Query (React Query) 5 | Server state, caching, loading/error handling |
| Axios | HTTP client |
| React Dropzone | Drag-and-drop file uploads |
| Lucide React | Icons |

---

## Backend

| Tool | Purpose |
|------|---------|
| Python 3.11+ | Language |
| FastAPI 0.110+ | REST API framework (async, auto-generates `/docs`) |
| Uvicorn | ASGI server |
| Pydantic v2 | Request/response validation |
| python-multipart | File upload handling |
| pdfplumber | PDF text extraction |
| langchain-text-splitters | Semantic text chunking |
| google-generativeai | Gemini SDK |
| supabase-py | Supabase client |
| python-dotenv | Environment variable loading |
| httpx | Async HTTP client (for fetching trusted source URLs) |
| beautifulsoup4 | HTML parsing |

---

## Database — Supabase

| Feature | Use |
|---------|-----|
| PostgreSQL | Relational data (documents, categories, reports, notifications) |
| pgvector extension | 768-dim text embeddings for semantic search |
| Supabase Auth | Admin JWT-based login |
| Supabase Storage | Raw uploaded PDF hosting |
| Row Level Security | Public read on published content, service key for backend writes |

---

## AI — Gemini

| Model | Used For |
|-------|---------|
| `models/text-embedding-004` | Generating 768-dim vectors for chunks and queries |
| `gemini-2.0-flash` | Drift audits, web grounding, report summaries |

Config: `temperature=0.0` on all audit calls for deterministic output.

---

## Environment Variables

### `project/backend/.env`
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSy...
FRONTEND_URL=http://localhost:5173
```

### `project/frontend/.env`
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## CORS

FastAPI allows requests from:
- `http://localhost:5173` (dev)
- `https://YOUR_USERNAME.github.io` (production)

Set `FRONTEND_URL` in `.env` for production.
