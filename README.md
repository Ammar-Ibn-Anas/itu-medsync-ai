# MedSync AI

A medical knowledge governance platform that automatically detects when study materials become outdated against the latest clinical guidelines.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Supabase account (free)
- Google Gemini API key (free at aistudio.google.com)

### 1. Set up Supabase
- Create a project at supabase.com
- Run the SQL from `_context/02_DATABASE_SCHEMA.md` in the SQL Editor
- Create a storage bucket named `raw-documents`
- Create an admin user in Authentication → Users

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env  # set VITE_API_URL=http://localhost:8000
npm run dev
# Visit http://localhost:5173
```

## Architecture
- **Frontend:** React + Vite + Tailwind CSS → GitHub Pages
- **Backend:** Python FastAPI → Railway.app
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI:** Google Gemini 2.0 Flash

## Documentation
See the `_context/` folder for detailed documentation on every aspect of the system.

| File | Contents |
|------|---------|
| `_context/00_PROJECT_OVERVIEW.md` | What the system is and who uses it |
| `_context/01_TECH_STACK.md` | All technologies and why |
| `_context/02_DATABASE_SCHEMA.md` | Full SQL schema |
| `_context/03_API_ROUTES.md` | All API endpoints |
| `_context/04_FRONTEND_PAGES.md` | All UI pages and components |
| `_context/05_AI_ENGINE.md` | Gemini integration details |
| `_context/06_DEPLOYMENT.md` | Deploy to production |
| `_context/07_IMPLEMENTATION_PHASES.md` | Step-by-step build order |
