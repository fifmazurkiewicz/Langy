import os

# Route tests authenticate with the "dev-token" escape hatch, which production rejects.
# Must run before app modules import get_settings (lru_cached at import time).
os.environ.setdefault("DEV_AUTH_ENABLED", "true")
os.environ.pop("SUPABASE_URL", None)
