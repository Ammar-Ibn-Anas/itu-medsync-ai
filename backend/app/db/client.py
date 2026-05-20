from supabase import create_client, Client
import os

_client: Client | None = None


def get_db() -> Client:
    global _client
    if _client is None:
        supabase_url = os.environ["SUPABASE_URL"]
        service_key  = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(supabase_url, service_key)
    return _client
