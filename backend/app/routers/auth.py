from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.db.client import get_db

router   = APIRouter()
security = HTTPBearer()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(req: LoginRequest):
    db = get_db()
    try:
        auth_response = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email
            }
        }
    except Exception:
        raise HTTPException(status_code=401, detail="invalid email or password")


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db()
    try:
        db.auth.sign_out()
    except Exception:
        pass
    return {"message": "logged out"}


@router.get("/me")
def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db()
    try:
        user_response = db.auth.get_user(credentials.credentials)
        return {
            "id": user_response.user.id,
            "email": user_response.user.email
        }
    except Exception:
        raise HTTPException(status_code=401, detail="invalid or expired token")


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency injected on all protected routes."""
    db = get_db()
    try:
        user_response = db.auth.get_user(credentials.credentials)
        return user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="not authenticated")
