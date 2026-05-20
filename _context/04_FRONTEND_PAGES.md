# 04 — Frontend Pages & Components

## File Naming

All files use snake_case:
- `admin_dashboard.jsx`
- `document_list.jsx`
- `use_documents.js`
- `api_client.js`
- `admin_store.js`

React component function names are PascalCase (React requirement — no exceptions):
- `export default function AdminDashboard()`
- `export default function DocumentList()`

JS variables, state, props, and function names inside components are snake_case:
```js
const [is_loading, set_is_loading] = useState(false)
const [doc_list, set_doc_list] = useState([])
function handle_submit() {}
const fetch_documents = async () => {}
```

---

## Routing Structure

```
/                             → student portal home (search + browse)
/document/:id                 → student document reader
/admin/login                  → admin login
/admin/                       → admin dashboard home
/admin/documents              → all documents management
/admin/documents/upload       → upload new document
/admin/documents/:id          → document detail + edit + audit history
/admin/categories             → category management
/admin/trusted_sources        → trusted url sources
/admin/audit/:id              → view full audit report
/admin/notifications          → notification centre
```

---

## File Structure

```
project/frontend/src/
├── pages/
│   ├── admin/
│   │   ├── admin_dashboard.jsx
│   │   ├── document_list.jsx
│   │   ├── document_upload.jsx
│   │   ├── document_detail.jsx
│   │   ├── audit_report.jsx
│   │   ├── category_manager.jsx
│   │   ├── trusted_sources.jsx
│   │   ├── notifications.jsx
│   │   └── admin_login.jsx
│   └── student/
│       ├── student_home.jsx
│       └── document_reader.jsx
├── components/
│   ├── nav_bar.jsx
│   ├── document_card.jsx
│   ├── audit_status_badge.jsx
│   ├── published_toggle.jsx
│   ├── search_bar.jsx
│   ├── category_badge.jsx
│   ├── confirm_modal.jsx
│   ├── progress_toast.jsx
│   ├── empty_state.jsx
│   ├── protected_route.jsx
│   └── audit_findings_list.jsx
├── hooks/
│   ├── use_documents.js
│   ├── use_audit.js
│   ├── use_notifications.js
│   └── use_search.js
├── services/
│   └── api_client.js          ← Axios instance + all API call functions
├── stores/
│   ├── admin_store.js         ← Zustand: auth token, user, unread count
│   └── student_store.js       ← Zustand: bookmarks (localStorage)
├── app.jsx
└── main.jsx
```

---

## Student Portal

### `/` — `student_home.jsx`

- Full-width hero with app name and search bar (autofocused)
- Category filter pills
- "Recently Updated" document cards grid
- Debounced search (400ms) calls `GET /api/v1/student/search?q=...`
- Results as `<DocumentCard>` components with similarity % and highlighted snippet
- Subtle "Admin Login" link in footer

### `/document/:id` — `document_reader.jsx`

- Left sidebar: document outline (chunk headings)
- Main: full document text with clean typography
- Right sidebar: category badge, last verified date, audit status, bookmark button
- Highlights matching chunk if user arrived from search

---

## Admin Portal

### `/admin/login` — `admin_login.jsx`

- Centred login form, email + password
- Calls `POST /api/v1/auth/login`
- Stores JWT in `localStorage` via `admin_store`
- Redirects to `/admin/`

### `/admin/` — `admin_dashboard.jsx`

- Top stat cards: Total Docs, Indexed, Pending Audit, Unread Notifications
- Recent audit activity feed (last 5)
- Documents needing attention (have contradictions)
- Quick action buttons

### `/admin/documents` — `document_list.jsx`

- Filter bar: search, category, status, doc_type
- Table: Title, Category, Type, Status badge, Last Audited, Published toggle, Actions
- Bulk select for bulk delete

### `/admin/documents/upload` — `document_upload.jsx`

- Toggle: PDF dropzone OR text paste
- Metadata fields: title, description, category (+ create new inline), doc_type
- Progress indicator while backend processes
- On success: redirect to document detail

### `/admin/documents/:id` — `document_detail.jsx`

Three tabs:
1. **Content** — extracted text in chunks, editable title/description/category
2. **Audit History** — table of past audits, click to view full report
3. **Settings** — published toggle, delete

"Run Audit" button → modal:
- Mode selector: Web Grounded / Compare Against Source
- Source doc picker (if source_doc mode)
- Start → shows progress bar → inline results on completion

### `/admin/audit/:id` — `audit_report.jsx`

- Header: doc name, date, summary stats
- AI summary paragraph
- Filter bar: show only Contradictions / Missing Context / Aligned
- Findings list — one card per chunk with status badge, explanation, evidence
- Export button

### `/admin/categories` — `category_manager.jsx`

- CRUD table, inline edit, colour picker

### `/admin/trusted_sources` — `trusted_sources.jsx`

- Table of whitelisted URLs, add/remove, "Fetch Now" button per row

### `/admin/notifications` — `notifications.jsx`

- Full notification list, newest first
- Type icons, title, body, timestamp, link to related doc/audit
- Mark all read button

---

## Global State

### `admin_store.js` (Zustand)
```js
{
  user: null,
  token: null,
  unread_count: 0,
  login: (token, user) => {},
  logout: () => {},
  set_unread_count: (n) => {}
}
```

### `student_store.js` (Zustand)
```js
{
  bookmarks: [],               // loaded from localStorage on init
  add_bookmark: (doc) => {},
  remove_bookmark: (id) => {},
  load_bookmarks: () => {}
}
```

---

## API Client (`services/api_client.js`)

```js
import axios from 'axios'

const api = axios.create({
  base_url: import.meta.env.VITE_API_URL,
})

// Attach JWT on every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

---

## Design System

**Admin:** Deep navy dark theme — serious, professional
- Background: `#0f1117`, Surface: `#1a1d27`, Border: `#2d3148`
- Accent: `#6366f1` (indigo), Danger: `#ef4444`, Warning: `#f59e0b`, Success: `#22c55e`

**Student:** Clean white/light — approachable, readable
- Background: `#fafafa`, Primary: `#0ea5e9` (sky blue)

**Typography:** Sora (headings) + Inter (body) from Google Fonts
