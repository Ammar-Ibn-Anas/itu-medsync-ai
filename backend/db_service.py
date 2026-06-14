import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def get_document_by_id(doc_id: str):
    return supabase.table("documents").select("*").eq("id", doc_id).execute().data[0]

def update_document_status(doc_id: str, status: str):
    supabase.table("documents").update({"status": status}).eq("id", doc_id).execute()

def insert_chunk(doc_id: str, chunk_text: str, embedding: list):
    supabase.table("document_chunks").insert({
        "document_id": doc_id,
        "chunk_text": chunk_text,
        "embedding": embedding
    }).execute()

def search_knowledge_base(query_embedding: list, doc_type: str, limit: int = 5):
    return supabase.rpc("search_knowledge_base", {
        "query_embedding": query_embedding,
        "doc_type_filter": doc_type,
        "match_count": limit
    }).execute().data