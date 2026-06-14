import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from ai_service import extract_text_from_pdf, get_embedding, run_audit_comparison
from db_service import supabase, insert_chunk, update_document_status, search_knowledge_base
from langchain_text_splitters import RecursiveCharacterTextSplitter
import json

load_dotenv()

app = FastAPI(title="MedSync AI Backend")

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the text splitter globally
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

@app.get("/")
def read_root():
    return {"status": "MedSync AI Backend is live and ready."}

@app.post("/api/documents/upload")
async def upload_document(
    title: str = Form(...),
    doc_type: str = Form(...), # Must be 'study_note' or 'trusted_source'
    file: UploadFile = File(...)
):
    """Module 1: Document Ingestion Pipeline"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for MVP")

    try:
        # 1. Extract Text
        file_bytes = await file.read()
        raw_text = extract_text_from_pdf(file_bytes)
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text. Is it a scanned image?")

        # 2. Save Metadata to DB
        doc_record = supabase.table("documents").insert({
            "title": title,
            "doc_type": doc_type,
            "file_url": file.filename,
            "status": "PROCESSING"
        }).execute().data[0]
        doc_id = doc_record["id"]

        # 3. Chunk and Embed
        chunks = text_splitter.split_text(raw_text)
        for chunk in chunks:
            embedding = get_embedding(chunk)
            insert_chunk(doc_id, chunk, embedding)

        # 4. Mark as Indexed
        update_document_status(doc_id, "INDEXED")

        return {"message": "Document indexed successfully", "doc_id": doc_id, "chunks_created": len(chunks)}

    except Exception as e:
        if 'doc_id' in locals():
            update_document_status(doc_id, "FAILED")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def semantic_search(query: str, doc_type: str = "study_note"):
    """Module 3: Semantic Student Search"""
    try:
        query_emb = get_embedding(query)
        results = search_knowledge_base(query_emb, doc_type)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audit/run")
async def run_audit_scan(study_note_id: str, trusted_source_id: str):
    """Module 2: Knowledge Drift Audit Engine"""
    try:
        # Fetch chunks
        note_chunks = supabase.table("document_chunks").select("*").eq("document_id", study_note_id).execute().data
        trusted_chunks_data = supabase.table("document_chunks").select("*").eq("document_id", trusted_source_id).execute().data
        
        if not note_chunks or not trusted_chunks_data:
            raise HTTPException(status_code=404, detail="Documents not indexed yet.")

        findings = []
        for note_chunk in note_chunks:
            # Find top 3 similar chunks in trusted source
            note_emb = get_embedding(note_chunk['chunk_text'])
            similar = search_knowledge_base(note_emb, "trusted_source", limit=3)
            
            if not similar:
                findings.append({"status": "Missing Context", "note_chunk": note_chunk['chunk_text'][:50]})
                continue

            # Get text of similar chunks
            context_texts = [s['chunk_text'] for s in similar]
            
            # Run AI Comparison
            result = run_audit_comparison(note_chunk['chunk_text'], context_texts)
            findings.append(result)

        # Save Report
        contradiction_count = sum(1 for f in findings if f.get('status') == 'Contradiction')
        supabase.table("audit_reports").insert({
            "study_note_id": study_note_id,
            "trusted_source_id": trusted_source_id,
            "findings": findings,
            "contradiction_count": contradiction_count
        }).execute()

        return {"message": "Audit Complete", "findings_summary": findings[:3]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))