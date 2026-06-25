from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

security = HTTPBearer()


def _init_firebase_admin():
    if firebase_admin._apps:
        return

    if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        return

    if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
        private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
        cred = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": private_key,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )
        firebase_admin.initialize_app(cred)
        return

    raise RuntimeError(
        "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or "
        "FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in backend/.env"
    )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        _init_firebase_admin()
        decoded = firebase_auth.verify_id_token(token)
        email = decoded.get("email")
        user = {
            "id": decoded.get("uid"),
            "email": email,
        }
        admin_emails = [e.strip() for e in settings.ADMIN_EMAILS if e.strip()]
        user["is_admin"] = email in admin_emails
        return user
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Firebase token",
        )

