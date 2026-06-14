import os
import io
import json
import requests as http_requests
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from auth_service import hash_password, verify_password, create_access_token, get_current_admin
from ai_service import extract_text_from_pdf, get_embedding, run_audit_comparison
from ai_scanner import scan_for_references, generate_document_summary, compare_with_web_content
from db_service import (
    supabase, get_all_categories, create_category, update_category, delete_category,
    get_documents_with_categories, get_document_by_id, delete_document, insert_chunk, update_document_status,
    search_knowledge_base, get_notifications, create_notification, mark_notification_read,
    mark_all_notifications_read, get_unread_notification_count
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

app = FastAPI(title="MedSync AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    email: str
    password: str

class SetupRequest(BaseModel):
    email: str
    password: str
    name: str

class CategoryCreate(BaseModel):
    name: str
    description: str = ""

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[str] = None
    reference_links: Optional[list] = None
    summary: Optional[str] = None
    auto_summary_enabled: Optional[bool] = None
    drift_status: Optional[str] = None

class BulkDelete(BaseModel):
    ids: list[str]

class DriftStatusUpdate(BaseModel):
    status: str


@app.get("/")
def read_root():
    return {"status": "MedSync AI Backend is live. Powered by Ollama."}

# ==========================================
# AUTH ENDPOINTS
# ==========================================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    users = supabase.table("admin_users").select("*").eq("email", req.email).execute().data
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = users[0]
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

@app.post("/api/auth/setup")
def setup_admin(req: SetupRequest):
    existing = supabase.table("admin_users").select("id").limit(1).execute().data
    if existing:
        raise HTTPException(status_code=400, detail="Admin user already exists. Use login.")
        
    hashed = hash_password(req.password)
    user = supabase.table("admin_users").insert({
        "email": req.email,
        "password_hash": hashed,
        "name": req.name
    }).execute().data[0]
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

@app.get("/api/auth/me")
def get_me(admin: dict = Depends(get_current_admin)):
    users = supabase.table("admin_users").select("id, name, email").eq("id", admin["sub"]).execute().data
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[0]

# ==========================================
# CATEGORY ENDPOINTS
# ==========================================

@app.get("/api/categories")
def list_categories(admin: dict = Depends(get_current_admin)):
    return get_all_categories()

@app.post("/api/categories")
def add_category(cat: CategoryCreate, admin: dict = Depends(get_current_admin)):
    try:
        return create_category(cat.name, cat.description)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/categories/{cat_id}")
def edit_category(cat_id: str, cat: CategoryCreate, admin: dict = Depends(get_current_admin)):
    return update_category(cat_id, cat.name, cat.description)

@app.delete("/api/categories/{cat_id}")
def remove_category(cat_id: str, admin: dict = Depends(get_current_admin)):
    delete_category(cat_id)
    return {"message": "Category deleted"}

# ==========================================
# DOCUMENT ENDPOINTS
# ==========================================

def _process_and_store(title: str, doc_type: str, raw_text: str, source_ref: str, category_id: str = None, file_bytes: bytes = None):
    if not raw_text.strip():
        raise ValueError("No text could be extracted from the document.")

    doc_data = {
        "title": title,
        "doc_type": doc_type,
        "file_url": source_ref,
        "status": "PROCESSING",
        "category_id": category_id or None
    }
    
    if file_bytes:
        # Note: storing raw bytes in DB isn't great for scaling, 
        # but works perfectly for this MVP without dealing with Supabase Storage buckets
        import base64
        doc_data["file_bytes"] = file_bytes.hex() # Convert to hex string for postgres bytea

    doc_record = supabase.table("documents").insert(doc_data).execute().data[0]
    doc_id = doc_record["id"]

    try:
        chunks = text_splitter.split_text(raw_text)
        for chunk in chunks:
            embedding = get_embedding(chunk)
            insert_chunk(doc_id, chunk, embedding)
        update_document_status(doc_id, "INDEXED")
    except Exception as e:
        update_document_status(doc_id, "FAILED")
        raise e

    return doc_id, len(chunks)


@app.get("/api/documents")
def list_documents(category_id: str = None, admin: dict = Depends(get_current_admin)):
    # Don't return file_bytes in the list view to save bandwidth
    docs = get_documents_with_categories(category_id)
    for d in docs:
        d.pop("file_bytes", None)
    return {"documents": docs}

@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str, admin: dict = Depends(get_current_admin)):
    doc = get_document_by_id(doc_id)
    doc.pop("file_bytes", None)
    return doc

@app.post("/api/documents/upload")
async def upload_document(
    title: str = Form(...),
    doc_type: str = Form(...),
    category_id: str = Form(None),
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_pdf(file_bytes)
        doc_id, chunk_count = _process_and_store(title, doc_type, raw_text, file.filename, category_id, file_bytes)
        return {"message": "Document indexed successfully", "doc_id": doc_id, "chunks_created": chunk_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload-url")
async def upload_from_url(
    title: str = Form(...),
    doc_type: str = Form(...),
    category_id: str = Form(None),
    url: str = Form(...),
    admin: dict = Depends(get_current_admin)
):
    url = url.strip()
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = http_requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    content_type = resp.headers.get("content-type", "")
    file_bytes = None

    if url.lower().endswith(".pdf") or "application/pdf" in content_type:
        try:
            file_bytes = resp.content
            raw_text = extract_text_from_pdf(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF parse error: {str(e)}")
    else:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
        raw_text = soup.get_text(separator="\n", strip=True)

    try:
        doc_id, chunk_count = _process_and_store(title, doc_type, raw_text, url, category_id, file_bytes)
        return {"message": "Document indexed successfully", "doc_id": doc_id, "chunks_created": chunk_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/documents/{doc_id}")
def update_document(doc_id: str, updates: DocumentUpdate, admin: dict = Depends(get_current_admin)):
    data = {k: v for k, v in updates.dict().items() if v is not None}
    if not data:
        return {"message": "Nothing to update"}
    
    data["updated_at"] = "now()"
    updated = supabase.table("documents").update(data).eq("id", doc_id).execute().data[0]
    updated.pop("file_bytes", None)
    return updated

@app.delete("/api/documents/{doc_id}")
def remove_document(doc_id: str, admin: dict = Depends(get_current_admin)):
    delete_document(doc_id)
    return {"message": "Document deleted"}

@app.post("/api/documents/bulk-delete")
def bulk_remove(req: BulkDelete, admin: dict = Depends(get_current_admin)):
    for doc_id in req.ids:
        delete_document(doc_id)
    return {"message": f"Deleted {len(req.ids)} documents"}

@app.post("/api/documents/{doc_id}/scan-references")
def scan_doc_references(doc_id: str, admin: dict = Depends(get_current_admin)):
    # Get all chunks
    chunks = supabase.table("document_chunks").select("chunk_text").eq("document_id", doc_id).execute().data
    if not chunks:
        raise HTTPException(status_code=404, detail="Document text not found")
        
    full_text = "\n".join([c["chunk_text"] for c in chunks])
    
    refs = scan_for_references(full_text)
    
    # Save to document
    supabase.table("documents").update({"reference_links": refs}).eq("id", doc_id).execute()
    return {"references": refs}

@app.post("/api/documents/{doc_id}/generate-summary")
def gen_summary(doc_id: str, admin: dict = Depends(get_current_admin)):
    chunks = supabase.table("document_chunks").select("chunk_text").eq("document_id", doc_id).execute().data
    if not chunks:
        raise HTTPException(status_code=404, detail="Document text not found")
        
    full_text = "\n".join([c["chunk_text"] for c in chunks])
    summary = generate_document_summary(full_text)
    
    supabase.table("documents").update({"summary": summary}).eq("id", doc_id).execute()
    return {"summary": summary}

@app.get("/api/documents/{doc_id}/download")
def download_pdf(doc_id: str, admin: dict = Depends(get_current_admin)):
    doc = supabase.table("documents").select("title, file_bytes").eq("id", doc_id).execute().data[0]
    
    if not doc.get("file_bytes"):
        raise HTTPException(status_code=404, detail="PDF file not stored for this document")
        
    # Convert hex string back to bytes
    import binascii
    try:
        # If it starts with \x, strip it
        hex_str = doc["file_bytes"]
        if hex_str.startswith("\\x"):
            hex_str = hex_str[2:]
        pdf_bytes = binascii.unhexlify(hex_str)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decode PDF: {str(e)}")

# ==========================================
# AUDIT ENDPOINTS
# ==========================================

@app.post("/api/audit/run")
def run_audit_scan(study_note_id: str, trusted_source_id: str, admin: dict = Depends(get_current_admin)):
    # Existing single comparison functionality
    try:
        note_chunks = supabase.table("document_chunks").select("*").eq("document_id", study_note_id).execute().data
        trusted_chunks_data = supabase.table("document_chunks").select("*").eq("document_id", trusted_source_id).execute().data

        if not note_chunks or not trusted_chunks_data:
            raise HTTPException(status_code=404, detail="One or both documents not indexed yet.")

        findings = []
        for note_chunk in note_chunks[:5]: # limited for MVP speed
            note_emb = get_embedding(note_chunk["chunk_text"])
            similar = search_knowledge_base(note_emb, "trusted_source", limit=3)

            if not similar:
                findings.append({
                    "status": "Missing Context",
                    "explanation": "No matching content found in trusted source.",
                    "specific_change": ""
                })
                continue

            context_texts = [s["chunk_text"] for s in similar]
            result = run_audit_comparison(note_chunk["chunk_text"], context_texts)
            findings.append(result)

        contradiction_count = sum(1 for f in findings if f.get("status") == "Contradiction")
        missing_count = sum(1 for f in findings if f.get("status") == "Missing Context")

        return {
            "message": "Audit Complete",
            "summary": {
                "total_chunks_checked": len(findings),
                "contradictions": contradiction_count,
                "missing_context": missing_count,
                "aligned": len(findings) - contradiction_count - missing_count
            },
            "findings_summary": findings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audit/run-global")
def run_global_audit(admin: dict = Depends(get_current_admin)):
    """The main Drift Detection engine. Scans all docs against their reference URLs."""
    docs = supabase.table("documents").select("id, title, reference_links").eq("status", "INDEXED").execute().data
    
    results = {"checked": 0, "drift_detected": 0, "failed": 0}
    
    for doc in docs:
        links = doc.get("reference_links", [])
        if not links:
            continue
            
        doc_id = doc["id"]
        
        # Get doc text (limited to 3 chunks to optimize)
        chunks = supabase.table("document_chunks").select("chunk_text").eq("document_id", doc_id).execute().data
        doc_text = "\n".join([c["chunk_text"] for c in chunks[:3]])
        
        print(f"[AUDIT] Processing document: '{doc['title']}' (Using {min(3, len(chunks))} chunks)", flush=True)
        
        drift_found = False
        report = []
        
        for link in links:
            url = link.get("url")
            if not url or not url.startswith("http"):
                continue
                
            print(f"[AUDIT] -> Checking reference URL: {url}", flush=True)
            results["checked"] += 1
            
            try:
                # Fetch URL
                headers = {"User-Agent": "Mozilla/5.0"}
                resp = http_requests.get(url, headers=headers, timeout=15)
                if resp.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "html.parser")
                    web_text = soup.get_text(separator="\n", strip=True)
                    
                    # Compare
                    comp = compare_with_web_content(doc_text, web_text, link.get("name", "Source"))
                    report.append({"source": link.get("name"), "url": url, "comparison": comp})
                    
                    if comp.get("has_changes") and comp.get("severity") in ["minor", "major"]:
                        drift_found = True
            except Exception as e:
                report.append({"source": link.get("name"), "url": url, "error": str(e)})
                results["failed"] += 1
        
        # Update doc status
        if drift_found:
            results["drift_detected"] += 1
            supabase.table("documents").update({
                "drift_status": "REQUIRES_ATTENTION",
                "drift_report": report,
                "last_audited_at": "now()"
            }).eq("id", doc_id).execute()
            
            create_notification(
                doc_id, "DRIFT_DETECTED",
                f"Drift Detected: {doc['title']}",
                "Automated audit found potential changes in referenced guidelines."
            )
        elif report:
            # Audited but OK
            supabase.table("documents").update({
                "drift_status": "OK",
                "drift_report": report,
                "last_audited_at": "now()"
            }).eq("id", doc_id).execute()
            
    print(f"[AUDIT COMPLETE] Checked: {results['checked']}, Drift Found: {results['drift_detected']}, Failed: {results['failed']}", flush=True)        
    return results

@app.put("/api/documents/{doc_id}/drift-status")
def update_drift_status(doc_id: str, req: DriftStatusUpdate, admin: dict = Depends(get_current_admin)):
    supabase.table("documents").update({"drift_status": req.status}).eq("id", doc_id).execute()
    return {"message": f"Status updated to {req.status}"}

# ==========================================
# NOTIFICATIONS ENDPOINTS
# ==========================================

@app.get("/api/notifications")
def list_notifications(admin: dict = Depends(get_current_admin)):
    return get_notifications()

@app.get("/api/notifications/unread-count")
def unread_count(admin: dict = Depends(get_current_admin)):
    return {"count": get_unread_notification_count()}

@app.put("/api/notifications/{n_id}/read")
def read_notification(n_id: str, admin: dict = Depends(get_current_admin)):
    mark_notification_read(n_id)
    return {"message": "Marked read"}

@app.put("/api/notifications/read-all")
def read_all_notifications(admin: dict = Depends(get_current_admin)):
    mark_all_notifications_read()
    return {"message": "All marked read"}

# ==========================================
# PUBLIC STUDENT ENDPOINTS
# ==========================================

@app.get("/api/public/categories")
def public_categories():
    # Return categories with document counts
    cats = supabase.table("categories").select("*").execute().data
    
    # Get counts using a simpler approach
    for c in cats:
        # Just getting the length of array is fine for MVP
        docs = supabase.table("documents").select("id").eq("category_id", c["id"]).eq("status", "INDEXED").execute().data
        c["document_count"] = len(docs)
        
    return cats

@app.get("/api/public/documents")
def public_documents(category_id: str = None):
    query = supabase.table("documents").select("id, title, category_id, summary, updated_at, categories(name)").eq("status", "INDEXED")
    if category_id:
        query = query.eq("category_id", category_id)
    return query.order("updated_at", desc=True).execute().data

@app.get("/api/public/documents/{doc_id}")
def public_get_document(doc_id: str):
    doc = supabase.table("documents").select("id, title, category_id, summary, updated_at, reference_links, categories(name)").eq("id", doc_id).execute().data
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc[0]

@app.get("/api/public/documents/{doc_id}/download")
def public_download_pdf(doc_id: str):
    # Reuse the admin download logic but without auth
    doc = supabase.table("documents").select("title, file_bytes").eq("id", doc_id).execute().data[0]
    if not doc.get("file_bytes"):
        raise HTTPException(status_code=404, detail="PDF file not stored")
        
    import binascii
    try:
        hex_str = doc["file_bytes"]
        if hex_str.startswith("\\x"):
            hex_str = hex_str[2:]
        pdf_bytes = binascii.unhexlify(hex_str)
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc["title"]}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decode PDF: {str(e)}")

@app.get("/api/public/search")
def public_search(query: str, limit: int = 10):
    try:
        query_emb = get_embedding(query)
        # Using the RPC that searches ALL documents
        results = supabase.rpc("search_all_documents", {
            "query_embedding": query_emb,
            "match_count": limit
        }).execute().data
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# DEBUG ENDPOINTS
# ==========================================

@app.get("/api/debug/documents")
def debug_documents():
    docs = supabase.table("documents").select("id, title, status, created_at").order("created_at", desc=True).execute().data
    for d in docs:
        chunks = supabase.table("document_chunks").select("id").eq("document_id", d["id"]).execute().data
        d["chunk_count"] = len(chunks)
    return docs

@app.get("/api/debug/chunks/{doc_id}")
def debug_chunks(doc_id: str):
    chunks = supabase.table("document_chunks").select("chunk_text, created_at").eq("document_id", doc_id).limit(5).execute().data
    return chunks

@app.get("/api/debug/audit/{report_id}")
def debug_audit(report_id: str):
    doc = supabase.table("documents").select("drift_report").eq("id", report_id).execute().data
    if not doc:
        return {"error": "Report/Document not found"}
    return doc[0].get("drift_report", [])
