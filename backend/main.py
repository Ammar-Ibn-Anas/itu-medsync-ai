import os
import io
import requests as http_requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ai_service import extract_text_from_pdf, get_embedding, run_audit_comparison
from db_service import supabase, insert_chunk, update_document_status, search_knowledge_base
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

app = FastAPI(title="MedSync AI Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)


@app.get("/")
def read_root():
    return {"status": "MedSync AI Backend is live. Powered by Ollama (local AI)."}


# ─────────────────────────────────────────────
# MODULE 1: DOCUMENT INGESTION
# ─────────────────────────────────────────────

def _process_and_store(title: str, doc_type: str, raw_text: str, source_ref: str):
    """Shared helper: chunk, embed, and store a document. Returns doc_id."""
    if not raw_text.strip():
        raise ValueError("No text could be extracted from the document.")

    doc_record = supabase.table("documents").insert({
        "title": title,
        "doc_type": doc_type,
        "file_url": source_ref,
        "status": "PROCESSING"
    }).execute().data[0]
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


@app.post("/api/documents/upload")
async def upload_document(
    title: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a PDF directly from your computer."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_pdf(file_bytes)
        doc_id, chunk_count = _process_and_store(title, doc_type, raw_text, file.filename)
        return {"message": "Document indexed successfully", "doc_id": doc_id, "chunks_created": chunk_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/upload-url")
async def upload_from_url(
    title: str = Form(...),
    doc_type: str = Form(...),
    url: str = Form(...)
):
    """
    Ingest a document from a URL.
    - If URL ends in .pdf: download and parse it directly.
    - Otherwise: fetch the page HTML and strip tags to get plain text.
    - If the request fails (403, timeout, etc): return a helpful error message.
    """
    url = url.strip()
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MedSync-Bot/1.0)"
    }

    try:
        resp = http_requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
    except http_requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response else "unknown"
        raise HTTPException(
            status_code=422,
            detail=f"Could not read this website (HTTP {status_code}). Please download the PDF and use the Upload feature instead."
        )
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not reach the URL: {str(e)}. Please download the PDF and use the Upload feature instead."
        )

    # Detect content type
    content_type = resp.headers.get("content-type", "")

    if url.lower().endswith(".pdf") or "application/pdf" in content_type:
        # It's a PDF — parse it the same way as file upload
        try:
            raw_text = extract_text_from_pdf(resp.content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF parse error: {str(e)}")
    else:
        # It's a webpage — strip HTML tags with a simple approach
        from html.parser import HTMLParser

        class _TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.parts = []
                self._skip = False

            def handle_starttag(self, tag, attrs):
                if tag in ("script", "style", "nav", "footer", "header"):
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in ("script", "style", "nav", "footer", "header"):
                    self._skip = False

            def handle_data(self, data):
                if not self._skip and data.strip():
                    self.parts.append(data.strip())

        parser = _TextExtractor()
        parser.feed(resp.text)
        raw_text = "\n".join(parser.parts)

    try:
        doc_id, chunk_count = _process_and_store(title, doc_type, raw_text, url)
        return {"message": "Document indexed from URL successfully", "doc_id": doc_id, "chunks_created": chunk_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# MODULE 2: AUDIT ENGINE
# ─────────────────────────────────────────────

@app.post("/api/audit/run")
async def run_audit_scan(study_note_id: str, trusted_source_id: str):
    """Compare a study note against a trusted source chunk-by-chunk."""
    try:
        note_chunks = supabase.table("document_chunks").select("*").eq("document_id", study_note_id).execute().data
        trusted_chunks_data = supabase.table("document_chunks").select("*").eq("document_id", trusted_source_id).execute().data

        if not note_chunks or not trusted_chunks_data:
            raise HTTPException(status_code=404, detail="One or both documents are not indexed yet.")

        findings = []
        # Only compare first 5 chunks for MVP speed during demo
        for note_chunk in note_chunks[:5]:
            note_emb = get_embedding(note_chunk["chunk_text"])
            similar = search_knowledge_base(note_emb, "trusted_source", limit=3)

            if not similar:
                findings.append({
                    "status": "Missing Context",
                    "explanation": "No matching content found in the trusted source.",
                    "specific_change": ""
                })
                continue

            context_texts = [s["chunk_text"] for s in similar]
            result = run_audit_comparison(note_chunk["chunk_text"], context_texts)
            findings.append(result)

        contradiction_count = sum(1 for f in findings if f.get("status") == "Contradiction")
        missing_count = sum(1 for f in findings if f.get("status") == "Missing Context")

        # Save report to DB
        supabase.table("audit_reports").insert({
            "study_note_id": study_note_id,
            "trusted_source_id": trusted_source_id,
            "findings": findings,
            "contradiction_count": contradiction_count
        }).execute()

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# MODULE 3: STUDENT SEARCH
# ─────────────────────────────────────────────

@app.get("/api/search")
async def semantic_search(query: str, doc_type: str = "study_note"):
    """Semantic search across indexed documents."""
    try:
        query_emb = get_embedding(query)
        results = search_knowledge_base(query_emb, doc_type)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# UTILITY
# ─────────────────────────────────────────────

@app.get("/api/documents")
async def list_documents():
    """List all indexed documents — used by the frontend dropdowns."""
    try:
        data = supabase.table("documents").select("id, title, doc_type, status, created_at").order("created_at", desc=True).execute().data
        return {"documents": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
