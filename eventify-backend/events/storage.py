import os
import uuid

from django.core.files.storage import Storage
from django.core.files.utils import validate_file_name
from django.utils.deconstruct import deconstructible
from supabase import create_client


@deconstructible
class SupabaseStorage(Storage):
    def __init__(self):
        self.base_url = os.getenv("SUPABASE_URL", "https://igyoafdermvrjxsciqoa.supabase.co")
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "event-images")
        self._client = None

    @property
    def client(self):
        if not self.service_role_key:
            raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required for image uploads")
        if self._client is None:
            self._client = create_client(self.base_url, self.service_role_key)
        return self._client

    def _save(self, name, content):
        name = validate_file_name(name, allow_relative_path=True)
        extension = os.path.splitext(name)[1].lower()
        object_name = f"events/{uuid.uuid4().hex}{extension}"
        payload = content.read()
        content_type = getattr(content, "content_type", None) or "application/octet-stream"
        self.client.storage.from_(self.bucket).upload(
            object_name,
            payload,
            {"content-type": content_type, "upsert": "false"},
        )
        return object_name

    def _open(self, name, mode="rb"):
        raise NotImplementedError("Supabase files are served by URL and are not opened by Django")

    def exists(self, name):
        return False

    def url(self, name):
        return self.client.storage.from_(self.bucket).get_public_url(name)

    def delete(self, name):
        if name:
            self.client.storage.from_(self.bucket).remove([name])
