# MedSync AI — Source Code

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_API_URL=http://localhost:8000
npm run dev
```
App: http://localhost:5173

## Structure
```
project/
├── frontend/    ← React + Vite + Tailwind
└── backend/     ← Python FastAPI
```
