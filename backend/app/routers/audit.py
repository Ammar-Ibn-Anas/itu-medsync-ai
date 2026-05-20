from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_db
from app.services.audit_service import run_audit
from app.routers.auth import get_current_admin
from datetime import datetime, timezone
import uuid

router = APIRouter()


class AuditRequest(BaseModel):
    document_id: str
    mode: str  # "web_grounded" | "source_doc"
    trusted_source_doc_id: Optional[str] = None


@router.post("/run")
async def run_audit_endpoint(
    req: AuditRequest,
    background_tasks: BackgroundTasks,
    _admin=Depends(get_current_admin)
):
    """
    Trigger an audit on a document.
    Returns immediately with audit_id for polling.
    """
    db = get_db()

    # verify document exists
    doc_response = db.table("documents").select("id, status").eq("id", req.document_id).single().execute()
    if not doc_response.data:
        raise HTTPException(status_code=404, detail="document not found")

    if doc_response.data.get("status") not in ["pending", "indexed", "failed"]:
        raise HTTPException(status_code=400, detail=f"cannot audit document with status: {doc_response.data.get('status')}")

    # create audit report record
    audit_id = str(uuid.uuid4())
    audit_data = {
        "id": audit_id,
        "document_id": req.document_id,
        "triggered_by": _admin.id if hasattr(_admin, 'id') else None,
        "status": "running",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.table("audit_reports").insert(audit_data).execute()

    # kick off background task
    background_tasks.add_task(
        run_audit,
        audit_id=audit_id,
        document_id=req.document_id,
        mode=req.mode,
        trusted_source_doc_id=req.trusted_source_doc_id
    )

    return {"audit_id": audit_id, "status": "running"}


@router.get("/{audit_id}")
def get_audit(audit_id: str, _admin=Depends(get_current_admin)):
    """
    Poll for audit completion. Returns full findings once done.
    """
    db = get_db()
    result = db.table("audit_reports").select("*").eq("id", audit_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="audit not found")
    return result.data


@router.get("/document/{document_id}")
def get_document_audits(
    document_id: str,
    _admin=Depends(get_current_admin)
):
    """
    Get all audits for a specific document.
    """
    db = get_db()
    # verify document exists
    doc_response = db.table("documents").select("id").eq("id", document_id).single().execute()
    if not doc_response.data:
        raise HTTPException(status_code=404, detail="document not found")

    result = db.table("audit_reports")\
        .select("*")\
        .eq("document_id", document_id)\
        .order("created_at", desc=True)\
        .execute()
    return {"audits": result.data}


@router.get("")
def list_audits(
    status: Optional[str] = None,
    _admin=Depends(get_current_admin)
):
    """
    List all audits with optional status filter.
    """
    db = get_db()
    query = db.table("audit_reports").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return {"audits": result.data}
