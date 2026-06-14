# MedSync AI

**Medical Knowledge Drift Detection Platform**

MedSync AI automatically detects when medical study materials become outdated against the latest clinical guidelines. It uses vector embeddings and a local LLM to compare documents chunk-by-chunk, flagging contradictions and missing context — so students always know if their notes are still accurate.

---

## The Problem

Medical students study from old notes. New clinical guidelines come out. The old notes become **dangerously outdated**, but no one has time to re-read 500 pages to find the 3 changed drug dosages.

## The Solution

1. An admin uploads a **Trusted Source** (new guideline) and a **Study Note** (old material).
2. The system chunks both into 500-token segments, and generates **vector embeddings** for semantic search.
3. An LLM compares each chunk of the study note against the most relevant chunks of the trusted source.
4. The system produces a **Delta Report** flagging each chunk as: `Contradiction`, `Missing Context`, or `Aligned`.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast, simple, no build complexity |
| Backend | Python FastAPI | Async, auto-docs at `/docs` |
| Database | Supabase (PostgreSQL + pgvector) | Free, handles vector similarity search |
| Embeddings | Ollama `nomic-embed-text` (768 dims) | Local, zero-cost, zero-latency |
| LLM | Ollama `llama3.2:3b` | Local, zero-cost, runs offline |

### Architectural Trade-off: Local AI vs Cloud AI

We originally designed this with Google Gemini. After encountering persistent API permission errors, we pivoted to **Ollama (local LLM)**.

**Trade-offs made:**
- ✅ Zero operating costs — no API usage fees ever
- ✅ Zero API latency — no network round-trips for inference  
- ✅ Complete data privacy — patient/student data never leaves the machine
- ✅ Works fully offline — no internet required after model download
- ❌ Requires the host machine to have enough RAM (4–8 GB for llama3.2:3b)
- ❌ Not horizontally scalable without more hardware

For a university MVP, this is the correct trade-off. For production at scale, we would migrate to a managed inference API (Groq, Together.ai, or a private GPU server).

### Bookmarks: localStorage vs Database

Student bookmarks are stored in browser `localStorage` (not Supabase) because:
- No login required for students — there is no user ID to attach records to
- Bookmarks are personal and ephemeral — they don't need to sync across devices for this use case
- It eliminates a database table and an entire auth layer for the MVP

---

## Setup & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.com) installed
- Supabase account (free at supabase.com)

### 1. Ollama Models (One-time download)
```bash
ollama pull nomic-embed-text   # embeddings model (768 dims)
ollama pull llama3.2:3b        # LLM for audit comparisons
```

Verify they're ready:
```bash
ollama list
```

### 2. Supabase Setup
- Create a project at supabase.com
- Run the SQL schema in the SQL Editor (see `_context/02_DATABASE_SCHEMA.md`)
- Get your `SUPABASE_URL` and `SUPABASE_KEY` from Project Settings → API

### 3. Backend
```bash
# From the project root, activate the virtual environment
source .venv/bin/activate

cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_KEY (no Gemini key needed)

uvicorn main:app --reload --port 8000
```

Backend API docs available at: http://localhost:8000/docs

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## How to Demo

1. **Start the backend** (`uvicorn main:app --reload`) and **Ollama** (it runs automatically in background after `ollama pull`)
2. **Start the frontend** (`npm run dev`)
3. Go to **Admin Dashboard** → Upload a Trusted Source (e.g. a new clinical guideline PDF)
4. Upload a Study Note (e.g. an older student note on the same topic)
5. Click **Run Audit** — select both documents from the dropdowns
6. See color-coded findings: 🔴 Contradictions, 🟡 Missing Context, 🟢 Aligned
7. Switch to **Student Portal** → search for a term → bookmark results

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/documents/upload` | Upload PDF file |
| `POST` | `/api/documents/upload-url` | Ingest from URL (PDF or webpage) |
| `GET` | `/api/documents` | List all indexed documents |
| `POST` | `/api/audit/run` | Run Knowledge Drift audit |
| `GET` | `/api/search` | Semantic search |

---

## Screenshots

*(Add screenshots here after the demo)*

---

## Team

BSAI University Project — MedSync AI