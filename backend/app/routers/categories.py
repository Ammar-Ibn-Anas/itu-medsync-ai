from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_db
from app.routers.auth import get_current_admin

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"


@router.get("")
def list_categories():
    db = get_db()
    return db.table("categories").select("*").order("name").execute().data


@router.post("")
def create_category(req: CategoryCreate, _admin=Depends(get_current_admin)):
    db = get_db()
    result = db.table("categories").insert(req.model_dump()).execute()
    return result.data[0]


@router.put("/{cat_id}")
def update_category(cat_id: str, req: CategoryCreate, _admin=Depends(get_current_admin)):
    db     = get_db()
    result = db.table("categories").update(req.model_dump()).eq("id", cat_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="category not found")
    return result.data[0]


@router.delete("/{cat_id}")
def delete_category(cat_id: str, _admin=Depends(get_current_admin)):
    db = get_db()
    db.table("categories").delete().eq("id", cat_id).execute()
    return {"message": "category deleted"}
