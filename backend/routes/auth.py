"""Auth routes — verifies Firebase token and returns user info."""

from fastapi import APIRouter, Depends
from core.firebase_auth import get_current_user
from core.config import ADMIN_EMAILS

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's info (from Firebase token)."""
    return {
        "uid": user["uid"],
        "email": user["email"],
        "name": user["name"],
        "picture": user["picture"],
        "is_admin": user["email"] in ADMIN_EMAILS,
    }


@router.post("/verify")
async def verify_token(user: dict = Depends(get_current_user)):
    """Verify that a Firebase ID token is valid. Used by frontend on app load."""
    return {"valid": True, "uid": user["uid"], "email": user["email"]}
