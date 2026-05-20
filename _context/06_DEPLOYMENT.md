# 06 — Deployment Guide

## Architecture

```
Browser (Student / Admin)
        │
        ▼
GitHub Pages           ← React SPA (static, free)
  project/frontend
        │ HTTPS API calls
        ▼
Railway.app            ← FastAPI Python backend (free tier)
  project/backend
        │
        ▼
Supabase Cloud         ← PostgreSQL + pgvector + Auth + Storage (free tier)
        │
        ▼
Gemini API             ← Google AI (free quota)
```

---

## Step 1 — Supabase

1. Create project at https://supabase.com
2. Note: `Project URL`, `anon public key`, `service_role key` (Settings → API)
3. SQL Editor → run all SQL from `_context/02_database_schema.md`
4. Storage → New bucket → name: `raw-documents` → Private
5. Authentication → Users → Add User (your admin email + password)

---

## Step 2 — Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create API key
3. Copy it — you'll use it as `GEMINI_API_KEY` in the backend `.env`

---

## Step 3 — Local Development

### Backend
```bash
cd project/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

### Frontend
```bash
cd project/frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm run dev
# → http://localhost:5173
```

---

## Step 4 — Share Locally with ngrok

While backend runs on port 8000:
```bash
ngrok http 8000
# Gives you: https://abc123.ngrok-free.app
```
Set `VITE_API_URL=https://abc123.ngrok-free.app` in frontend `.env` and restart dev server.
Now anyone can access your app via the ngrok URL.

---

## Step 5 — Deploy Backend to Railway

1. Push code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select root directory: `project/backend`
4. Railway auto-detects Python and runs `Procfile`
5. Add environment variables in Railway dashboard (same as `.env`)
6. Your backend URL: `https://medsync-ai-backend.up.railway.app`
7. Add this URL to CORS in backend `main.py` (via `FRONTEND_URL` env var)

`project/backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Step 6 — Deploy Frontend to GitHub Pages

### `project/frontend/vite.config.js`
```js
export default {
  base: '/medsync-ai/',   // your repo name
  // ...
}
```

### `.github/workflows/deploy.yml` (already in repo root)
Sets secrets in GitHub: Settings → Secrets → Actions:
- `VITE_API_URL` = Railway URL
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Push to main → GitHub Actions auto-builds and deploys frontend.
Live at: `https://YOUR_USERNAME.github.io/medsync-ai/`

### React Router Fix for GitHub Pages

`project/frontend/public/404.html`:
```html
<!DOCTYPE html><html><head>
<script>sessionStorage.redirect = location.href;</script>
<meta http-equiv="refresh" content="0;URL='/'">
</head></html>
```

Add to `project/frontend/index.html` `<head>`:
```html
<script>
(function(){
  var r = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (r && r !== location.href) history.replaceState(null, null, r);
})();
</script>
```

---

## Production Checklist

- [ ] Supabase RLS policies active
- [ ] `SUPABASE_SERVICE_KEY` never in frontend code
- [ ] CORS in FastAPI allows only your GitHub Pages domain
- [ ] `GEMINI_API_KEY` only in Railway env vars
- [ ] Strong admin password (not "password123")
- [ ] All new documents default `is_published = FALSE`
- [ ] Storage bucket set to Private
- [ ] `link_to_website.md` updated with real URLs
