import os
import uuid
from io import BytesIO
from urllib.parse import quote

from django.core.exceptions import ValidationError
from django.core.files.storage import Storage
from django.core.files.utils import validate_file_name
from django.utils.deconstruct import deconstructible
from PIL import Image, ImageOps, UnidentifiedImageError
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
        if content.size > 5 * 1024 * 1024:
            raise ValidationError("Event images must be 5 MB or smaller.")
        name = validate_file_name(name, allow_relative_path=True)
        extension = os.path.splitext(name)[1].lower()
        payload = content.read()
        content_type = getattr(content, "content_type", None) or "application/octet-stream"
        try:
            with Image.open(BytesIO(payload)) as image:
                if image.format in {"JPEG", "PNG", "WEBP"} and getattr(image, "n_frames", 1) == 1:
                    image = ImageOps.exif_transpose(image)
                    image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                    has_alpha = "A" in image.getbands() or "transparency" in image.info
                    optimized = BytesIO()
                    image.convert("RGBA" if has_alpha else "RGB").save(
                        optimized,
                        format="WEBP",
                        quality=82,
                        method=4,
                    )
                    optimized_payload = optimized.getvalue()
                    if len(optimized_payload) < len(payload):
                        payload = optimized_payload
                        extension = ".webp"
                        content_type = "image/webp"
        except UnidentifiedImageError:
            pass

        object_name = f"events/{uuid.uuid4().hex}{extension}"
        self.client.storage.from_(self.bucket).upload(
            object_name,
            payload,
            {
                "cache-control": "31536000",
                "content-type": content_type,
                "upsert": "false",
            },
        )
        return object_name

    def _open(self, name, mode="rb"):
        raise NotImplementedError("Supabase files are served by URL and are not opened by Django")

    def exists(self, name):
        return False

    def url(self, name):
        base_url = self.base_url.rstrip("/")
        bucket = quote(self.bucket, safe="")
        object_name = quote(name, safe="/")
        return f"{base_url}/storage/v1/object/public/{bucket}/{object_name}"

    def delete(self, name):
        if name:
            self.client.storage.from_(self.bucket).remove([name])
