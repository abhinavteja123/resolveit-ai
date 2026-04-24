"""Firebase Admin SDK initialisation + token verification middleware."""

import os
import logging
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.config import FIREBASE_CREDENTIALS_PATH, ADMIN_EMAILS

logger = logging.getLogger(__name__)

# ── Initialise Firebase Admin SDK ─────────────────────────────────────
_firebase_app = None
_firebase_init_error: str | None = None


def _init_firebase():
    """Initialise Firebase Admin SDK. Safe to call multiple times."""
    global _firebase_app, _firebase_init_error
    if _firebase_app is not None:
        return
    try:
        if os.path.exists(FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("[OK] Firebase Admin SDK initialised with service account")
        else:
            # Fall back to GOOGLE_APPLICATION_CREDENTIALS env or default credentials
            _firebase_app = firebase_admin.initialize_app()
            logger.info("[OK] Firebase Admin SDK initialised with default credentials")
    except Exception as exc:
        _firebase_init_error = str(exc)
        logger.error(f"[ERROR] Firebase Admin SDK failed to initialise: {exc}")


# Attempt init at import time — but don't crash
_init_firebase()

# ── Security scheme ───────────────────────────────────────────────────
_bearer = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Verify Firebase ID token and return decoded user info.

    Attaches: uid, email, name, picture to the returned dict.
    """
    # Check if Firebase is initialised
    if _firebase_app is None:
        logger.error(f"Firebase not initialised: {_firebase_init_error}")
        raise HTTPException(
            status_code=503,
            detail=f"Authentication service unavailable: {_firebase_init_error or 'Firebase not initialised'}",
        )

    token = creds.credentials
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")

    return {
        "uid": decoded.get("uid"),
        "email": decoded.get("email", ""),
        "name": decoded.get("name", ""),
        "picture": decoded.get("picture", ""),
    }


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """Require the caller to be an admin (email in ADMIN_EMAILS list)."""
    user_email = user["email"].lower().strip()
    admin_emails_lower = [e.lower().strip() for e in ADMIN_EMAILS]
    if user_email not in admin_emails_lower:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
