"""Supabase client singleton — used for DATABASE operations only (not auth)."""

import logging
from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client using the service-role key."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logger.info("[OK] Supabase client initialised")
        except Exception as exc:
            logger.error(f"[ERROR] Failed to create Supabase client: {exc}")
            raise
    return _client
