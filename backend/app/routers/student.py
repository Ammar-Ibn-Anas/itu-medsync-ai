from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.db.client import get_db
from app.services.gemini_service import gemini

router = APIRouter()


@router.get("/search")
def semantic_search(
    q: str = Query(..., min_length=2, description="natural language search query"),
    category_id: Optional[str] = None,
    limit: int = Query(5, ge=1, le=20)
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="search query cannot be empty")

    db = get_db()

    query_vector = gemini.embed_query(q)

    search_params = {
        "query_embedding": query_vector,
        "doc_type_filter": "study_note",
        "match_count": limit,
        "similarity_threshold": 0.55
    }

    results = db.rpc("search_knowledge_base", search_params).execute()
    result_list = results.data or []

    # post-filter by category if provided
    if category_id:
        result_list = [r for r in result_list if r.get("category_id") == category_id]

    return {
        "query": q,
        "results": result_list,
        "count": len(result_list)
    }


@router.get("/documents")
def list_published_documents(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db     = get_db()
    offset = (page - 1) * limit

    query = db.table("documents")\
        .select("id, title, description, category_id, last_verified_at, categories(name, color)")\
        .eq("is_published", True)\
        .eq("status", "indexed")\
        .eq("doc_type", "study_note")\
        .order("last_verified_at", desc=True)\
        .range(offset, offset + limit - 1)

    if category_id:
        query = query.eq("category_id", category_id)
    if search:
        query = query.ilike("title", f"%{search}%")

    result = query.execute()
    return {"documents": result.data, "page": page, "limit": limit}


@router.get("/documents/{doc_id}")
def get_published_document(doc_id: str):
    db = get_db()

    doc = db.table("documents")\
        .select("id, title, description, last_verified_at, raw_text, categories(name, color)")\
        .eq("id", doc_id)\
        .eq("is_published", True)\
        .single()\
        .execute()

    if not doc.data:
        raise HTTPException(status_code=404, detail="document not found")

    chunks = db.table("document_chunks")\
        .select("id, chunk_index, chunk_text")\
        .eq("document_id", doc_id)\
        .order("chunk_index")\
        .execute()

    return {**doc.data, "chunks": chunks.data}


@router.get("/categories")
def list_categories():
    db = get_db()
    return db.table("categories").select("*").order("name").execute().data
