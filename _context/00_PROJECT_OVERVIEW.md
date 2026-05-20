# 00 — Project Overview

## What Is This?

MedSync AI is a **medical knowledge governance platform** with two user-facing interfaces:

1. **Admin Dashboard** — for a medical content manager to upload documents, organise them into categories, and run AI-powered audits that detect outdated information against the latest online medical guidelines.
2. **Student Portal** — a clean, fast interface for students to search and read up-to-date medical study material.

The AI engine uses Google Gemini 2.0 Flash to semantically compare stored document chunks against live web sources and flag any "Knowledge Drift" — where existing content contradicts or is missing new clinical guidance.

---

## Naming Convention — READ THIS FIRST

**snake_case is used for absolutely everything possible:**

| Context | Convention | Example |
|---------|-----------|---------|
| Python files | snake_case | `audit_service.py` |
| Python variables | snake_case | `doc_id`, `is_published` |
| Python functions | snake_case | `run_audit()`, `get_db()` |
| JS/React files | snake_case | `admin_dashboard.jsx`, `use_documents.js` |
| JS variables | snake_case | `const is_loading`, `let doc_list` |
| JS functions | snake_case | `function fetch_documents()` |
| React state | snake_case | `const [is_loading, set_is_loading] = useState(false)` |
| Folder names | snake_case | `admin_documents/`, `trusted_sources/` |
| API endpoints | snake_case (underscores) | `/api/v1/admin/trusted_sources` |
| DB tables/columns | snake_case | `document_chunks`, `is_published` |
| CSS class names | Tailwind utility classes only (no custom CSS classes needed) | |

**The ONLY exceptions where PascalCase is used:**
- React component function names — React requires `function AdminDashboard()` not `function admin_dashboard()` because lowercase-starting tags are treated as HTML elements
- That's it. Nothing else gets PascalCase.

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **Knowledge Drift** | When medical notes become outdated as new guidelines are published |
| **Delta Report** | AI-generated output showing exactly what changed, what contradicts, what is missing |
| **Audit** | The process of comparing a stored document against current online evidence |
| **Trusted Source** | A whitelisted URL or uploaded PDF the admin marks as authoritative |
| **Chunk** | A semantically meaningful paragraph-sized segment of a document, used for vector search |
| **Embedding** | A mathematical vector representation of text, enabling semantic (meaning-based) search |

---

## Who Uses What

### Admin (the cousin)
- Logs in with a private admin account
- Uploads PDFs / text documents
- Organises documents into categories (e.g. "Cardiology", "Paediatrics")
- Triggers AI audits on any document
- Views Delta Reports with colour-coded findings (Contradiction / Missing Context / Aligned)
- Receives notifications when an audit flags critical drift
- Can edit, archive, or delete documents
- Can mark trusted external URLs as reference sources

### Student (public — no login)
- Searches using plain English
- Gets back the top 5 most relevant document sections
- Can bookmark results (stored in browser localStorage)
- Reads documents in a clean reader view
- Sees a "Last Verified" date on each document

---

## What the AI Does

1. **Embedding Generation** — converts text chunks into vectors for semantic search
2. **Drift Audit** — compares stored document chunks against retrieved web content, classifies each as `Contradiction`, `Missing Context`, or `Aligned`
3. **Web Grounding** — uses Gemini's native web search to pull latest medical guidelines
4. **Delta Report Generation** — produces a structured JSON report summarising all findings
5. **Notification Summary** — writes a short plain-English summary of critical findings

---

## Deployment

| Concern | Solution |
|---------|---------|
| Frontend | **GitHub Pages** (free, static SPA) |
| Backend | **Railway.app** (free tier, Python always-on) |
| Database | **Supabase** (free tier — PostgreSQL + pgvector + Auth + Storage) |
| AI | **Google Gemini API** (gemini-2.0-flash, free quota) |
| Local demo sharing | **ngrok** (`ngrok http 8000`) |

---

## Repository Structure

```
medsync-ai/                        ← git repo root
├── project/                       ← ALL source code lives here
│   ├── frontend/                  ← React SPA → GitHub Pages
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── admin/
│   │   │   │   └── student/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── stores/
│   │   ├── public/
│   │   ├── .env.example
│   │   └── package.json
│   └── backend/                   ← FastAPI Python → Railway
│       ├── app/
│       │   ├── routers/
│       │   ├── services/
│       │   ├── models/
│       │   └── db/
│       ├── main.py
│       ├── requirements.txt
│       ├── Procfile
│       └── .env.example
├── _context/                      ← AI agent context docs (you are here)
├── user_manual/
│   └── user_manual.md
├── final_presentation_demo/
│   └── demo_script.md
├── link_to_website.md
└── README.md
```
