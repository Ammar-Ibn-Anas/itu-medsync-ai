from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_db
from app.services.document_service import ingest_document
from app.routers.auth import get_current_admin

router = APIRouter()


@router.get("")
def list_documents(
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    _admin=Depends(get_current_admin)
):
    db     = get_db()
    offset = (page - 1) * limit

    query = db.table("documents")\
        .select("id, title, description, category_id, doc_type, status, is_published, last_audited_at, last_verified_at, created_at, categories(name, color)")\
        .order("created_at", desc=True)\
        .range(offset, offset + limit - 1)

    if category_id:
        query = query.eq("category_id", category_id)
    if status:
        query = query.eq("status", status)
    if doc_type:
        query = query.eq("doc_type", doc_type)
    if search:
        query = query.ilike("title", f"%{search}%")

    result = query.execute()
    return {"documents": result.data, "page": page, "limit": limit}


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category_id: Optional[str] = Form(None),
    doc_type: str = Form("study_note"),
    _admin=Depends(get_current_admin)
):
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="only pdf and txt files are supported")

    db         = get_db()
    file_bytes = await file.read()

    # upload raw file to supabase storage
    storage_path = f"documents/{file.filename}"
    file_url     = None
    try:
        db.storage.from_("raw-documents").upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type}
        )
        file_url = db.storage.from_("raw-documents").get_public_url(storage_path)
    except Exception:
        pass  # storage upload failure is non-critical

    doc_data = {
        "title": title,
        "description": description,
        "doc_type": doc_type,
        "status": "pending",
        "file_url": file_url,
        "is_published": False,
    }
    if category_id:
        doc_data["category_id"] = category_id

    doc    = db.table("documents").insert(doc_data).execute()
    doc_id = doc.data[0]["id"]

    background_tasks.add_task(ingest_document, doc_id=doc_id, file_bytes=file_bytes)

    return {"doc_id": doc_id, "status": "processing"}


class TextDocumentCreate(BaseModel):
    title: str
    description: str = ""
    category_id: Optional[str] = None
    doc_type: str = "study_note"
    content: str


@router.post("/text")
async def create_text_document(
    req: TextDocumentCreate,
    background_tasks: BackgroundTasks,
    _admin=Depends(get_current_admin)
):
    db = get_db()

    doc_data = {
        "title": req.title,
        "description": req.description,
        "doc_type": req.doc_type,
        "status": "pending",
        "is_published": False,
    }
    if req.category_id:
        doc_data["category_id"] = req.category_id

    doc    = db.table("documents").insert(doc_data).execute()
    doc_id = doc.data[0]["id"]

    background_tasks.add_task(ingest_document, doc_id=doc_id, raw_text=req.content)

    return {"doc_id": doc_id, "status": "processing"}


@router.get("/{doc_id}")
def get_document(doc_id: str, _admin=Depends(get_current_admin)):
    db     = get_db()
    result = db.table("documents").select("*").eq("id", doc_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="document not found")
    return result.data


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None


@router.put("/{doc_id}")
def update_document(doc_id: str, req: DocumentUpdate, _admin=Depends(get_current_admin)):
    db          = get_db()
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="no fields to update")
    result = db.table("documents").update(update_data).eq("id", doc_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/{doc_id}")
def delete_document(doc_id: str, _admin=Depends(get_current_admin)):
    db = get_db()
    db.table("documents").delete().eq("id", doc_id).execute()
    return {"message": "document deleted"}


@router.post("/{doc_id}/reindex")
async def reindex_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    _admin=Depends(get_current_admin)
):
    db     = get_db()
    result = db.table("documents").select("raw_text, status").eq("id", doc_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="document not found")

    # delete existing chunks then re-ingest
    db.table("document_chunks").delete().eq("document_id", doc_id).execute()
    db.table("documents").update({"status": "pending"}).eq("id", doc_id).execute()

    background_tasks.add_task(
        ingest_document,
        doc_id=doc_id,
        raw_text=result.data.get("raw_text")
    )
    return {"doc_id": doc_id, "status": "processing"}


class PublishToggle(BaseModel):
    is_published: bool


@router.patch("/{doc_id}/publish")
def toggle_publish(doc_id: str, req: PublishToggle, _admin=Depends(get_current_admin)):
    db     = get_db()
    result = db.table("documents").update({"is_published": req.is_published}).eq("id", doc_id).execute()
    return result.data[0] if result.data else {}
