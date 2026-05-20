from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.routers import auth, categories, admin_documents, trusted_sources, audit, notifications, student

app = FastAPI(
    title="MedSync AI API",
    description="Medical knowledge governance platform",
    version="1.0.0"
)

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,            prefix="/api/v1/auth",                    tags=["auth"])
app.include_router(categories.router,      prefix="/api/v1/categories",              tags=["categories"])
app.include_router(admin_documents.router, prefix="/api/v1/admin/documents",         tags=["admin_documents"])
app.include_router(trusted_sources.router, prefix="/api/v1/admin/trusted_sources",   tags=["admin_trusted_sources"])
app.include_router(audit.router,           prefix="/api/v1/admin/audit",             tags=["admin_audit"])
app.include_router(notifications.router,   prefix="/api/v1/admin/notifications",     tags=["admin_notifications"])
app.include_router(student.router,         prefix="/api/v1/student",                 tags=["student"])


@app.get("/api/v1/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}
