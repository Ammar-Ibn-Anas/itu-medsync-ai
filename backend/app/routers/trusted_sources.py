from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_db
from app.routers.auth import get_current_admin
import httpx
import hashlib
from datetime import datetime, timezone

router = APIRouter()


class TrustedSourceCreate(BaseModel):
    name: str
    url: str
    organisation: Optional[str] = None
    topic_tags: Optional[list[str]] = []


@router.get("")
def list_trusted_sources(_admin=Depends(get_current_admin)):
    db = get_db()
    return db.table("trusted_sources").select("*").order("name").execute().data


@router.post("")
def create_trusted_source(req: TrustedSourceCreate, _admin=Depends(get_current_admin)):
    db     = get_db()
    result = db.table("trusted_sources").insert(req.model_dump()).execute()
    return result.data[0]


@router.delete("/{source_id}")
def delete_trusted_source(source_id: str, _admin=Depends(get_current_admin)):
    db = get_db()
    db.table("trusted_sources").delete().eq("id", source_id).execute()
    return {"message": "trusted source deleted"}


@router.post("/{source_id}/fetch")
async def fetch_source_content(source_id: str, _admin=Depends(get_current_admin)):
    db     = get_db()
    source = db.table("trusted_sources").select("*").eq("id", source_id).single().execute()
    if not source.data:
        raise HTTPException(status_code=404, detail="trusted source not found")

    source_url = source.data["url"]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response     = await client.get(source_url, follow_redirects=True)
            content_text = response.text
            content_hash = hashlib.md5(content_text.encode()).hexdigest()

        db.table("trusted_sources").update({
            "last_fetched_at": datetime.now(timezone.utc).isoformat(),
            "last_content_hash": content_hash
        }).eq("id", source_id).execute()

        return {
            "message": "fetched successfully",
            "content_length": len(content_text),
            "content_hash": content_hash
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to fetch url: {str(e)}")
