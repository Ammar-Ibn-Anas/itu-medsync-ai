# 03 — API Routes

Base URL local: `http://localhost:8000`
Base URL production: `https://your-app.up.railway.app`
All routes prefixed: `/api/v1/`
FastAPI auto-docs: `/docs`

🔒 = requires `Authorization: Bearer <token>` header

---

## Auth

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/auth/login` | `{ email, password }` → `{ access_token, token_type, user }` |
| POST | `/api/v1/auth/logout` | Invalidate session |
| GET | `/api/v1/auth/me` 🔒 | Return current admin user |

---

## Categories

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/categories` | List all — **public** |
| POST | `/api/v1/categories` 🔒 | Create `{ name, description, color }` |
| PUT | `/api/v1/categories/{id}` 🔒 | Update |
| DELETE | `/api/v1/categories/{id}` 🔒 | Delete |

---

## Admin — Documents

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/admin/documents` 🔒 | List all, query: `category_id`, `status`, `doc_type`, `search`, `page`, `limit` |
| POST | `/api/v1/admin/documents/upload` 🔒 | Multipart: `file`, `title`, `description`, `category_id`, `doc_type` |
| POST | `/api/v1/admin/documents/text` 🔒 | `{ title, description, category_id, doc_type, content }` |
| GET | `/api/v1/admin/documents/{id}` 🔒 | Full document detail |
| PUT | `/api/v1/admin/documents/{id}` 🔒 | Update metadata |
| DELETE | `/api/v1/admin/documents/{id}` 🔒 | Delete document + chunks + reports |
| POST | `/api/v1/admin/documents/{id}/reindex` 🔒 | Re-run ingestion pipeline |
| PATCH | `/api/v1/admin/documents/{id}/publish` 🔒 | `{ is_published: bool }` |

---

## Admin — Trusted Sources

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/admin/trusted_sources` 🔒 | List all |
| POST | `/api/v1/admin/trusted_sources` 🔒 | `{ name, url, organisation, topic_tags }` |
| DELETE | `/api/v1/admin/trusted_sources/{id}` 🔒 | Delete |
| POST | `/api/v1/admin/trusted_sources/{id}/fetch` 🔒 | Manually fetch & hash URL content |

---

## Admin — Audit

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/admin/audit/run` 🔒 | `{ document_id, mode: "web_grounded"\|"source_doc", trusted_source_doc_id? }` → `{ audit_id, status: "running" }` |
| GET | `/api/v1/admin/audit/{id}` 🔒 | Poll audit status + full findings |
| GET | `/api/v1/admin/audit/document/{document_id}` 🔒 | All audits for a document |
| GET | `/api/v1/admin/audit` 🔒 | List all audits, query: `status` |

---

## Admin — Notifications

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/admin/notifications` 🔒 | List, query: `unread_only=true` |
| PATCH | `/api/v1/admin/notifications/{id}/read` 🔒 | Mark one as read |
| POST | `/api/v1/admin/notifications/read_all` 🔒 | Mark all as read |
| DELETE | `/api/v1/admin/notifications/{id}` 🔒 | Delete one |

---

## Student — Public

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/student/search` | `?q=...&category_id=...&limit=5` — semantic search |
| GET | `/api/v1/student/documents` | List published docs, query: `category_id`, `search`, `page`, `limit` |
| GET | `/api/v1/student/documents/{id}` | Full document + ordered chunks |
| GET | `/api/v1/student/categories` | List all categories |

---

## Health

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/health` | `{ status: "ok", version: "1.0.0" }` |

---

## Error Format

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

HTTP codes: `400` bad request, `401` not authenticated, `403` forbidden, `404` not found, `500` server error.
