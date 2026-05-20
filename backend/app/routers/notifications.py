from fastapi import APIRouter, HTTPException, Depends
from app.db.client import get_db
from app.routers.auth import get_current_admin

router = APIRouter()


@router.get("")
def list_notifications(
    unread_only: bool = False,
    _admin=Depends(get_current_admin)
):
    """
    List all notifications with optional filter for unread only.
    """
    db = get_db()
    query = db.table("notifications").select("*").order("created_at", desc=True)
    if unread_only:
        query = query.eq("is_read", False)
    result = query.execute()
    return {"notifications": result.data}


@router.patch("/{notif_id}/read")
def mark_as_read(notif_id: str, _admin=Depends(get_current_admin)):
    """
    Mark a single notification as read.
    """
    db = get_db()
    result = db.table("notifications").update({"is_read": True}).eq("id", notif_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="notification not found")
    return result.data[0]


@router.post("/read_all")
def mark_all_as_read(_admin=Depends(get_current_admin)):
    """
    Mark all notifications as read.
    """
    db = get_db()
    db.table("notifications").update({"is_read": True}).execute()
    return {"message": "all notifications marked as read"}


@router.delete("/{notif_id}")
def delete_notification(notif_id: str, _admin=Depends(get_current_admin)):
    """
    Delete a single notification.
    """
    db = get_db()
    db.table("notifications").delete().eq("id", notif_id).execute()
    return {"message": "notification deleted"}


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
