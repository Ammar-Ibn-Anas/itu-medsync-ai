import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# --- Categories ---
def get_all_categories():
    return supabase.table("categories").select("*").order("name").execute().data

def create_category(name: str, description: str = ""):
    return supabase.table("categories").insert({
        "name": name,
        "description": description
    }).execute().data[0]

def update_category(cat_id: str, name: str, description: str):
    return supabase.table("categories").update({
        "name": name,
        "description": description,
        "updated_at": "now()"
    }).eq("id", cat_id).execute().data[0]

def delete_category(cat_id: str):
    supabase.table("categories").delete().eq("id", cat_id).execute()

# --- Documents ---
def get_documents_with_categories(category_id=None):
    query = supabase.table("documents").select("*, categories(name)")
    if category_id:
        query = query.eq("category_id", category_id)
    return query.order("created_at", desc=True).execute().data

def get_document_by_id(doc_id: str):
    return supabase.table("documents").select("*, categories(name)").eq("id", doc_id).execute().data[0]

def update_document_status(doc_id: str, status: str):
    supabase.table("documents").update({"status": status}).eq("id", doc_id).execute()

def delete_document(doc_id: str):
    supabase.table("documents").delete().eq("id", doc_id).execute()

# --- Chunks ---
def insert_chunk(doc_id: str, chunk_text: str, embedding: list):
    supabase.table("document_chunks").insert({
        "document_id": doc_id,
        "chunk_text": chunk_text,
        "embedding": embedding
    }).execute()

# --- Search ---
def search_knowledge_base(query_embedding: list, doc_type: str, limit: int = 5):
    return supabase.rpc("search_knowledge_base", {
        "query_embedding": query_embedding,
        "doc_type_filter": doc_type,
        "match_count": limit
    }).execute().data

# --- Notifications ---
def get_notifications(limit=50):
    return supabase.table("notifications").select("*, documents(title)").order("created_at", desc=True).limit(limit).execute().data

def create_notification(document_id: str, type: str, title: str, message: str):
    return supabase.table("notifications").insert({
        "document_id": document_id,
        "type": type,
        "title": title,
        "message": message
    }).execute().data[0]

def mark_notification_read(notif_id: str):
    supabase.table("notifications").update({"is_read": True}).eq("id", notif_id).execute()

def mark_all_notifications_read():
    supabase.table("notifications").update({"is_read": True}).eq("is_read", False).execute()

def get_unread_notification_count() -> int:
    # Supabase Python client doesn't have a direct count() method that returns just the number easily
    # So we fetch IDs
    data = supabase.table("notifications").select("id").eq("is_read", False).execute().data
    return len(data)