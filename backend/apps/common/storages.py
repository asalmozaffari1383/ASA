"""S3-compatible storage backends (Part 5 §3 — Stateless Architecture).

All media must live in object storage, never on the application server's disk.
``django-storages`` + ``boto3`` talk to any S3-compatible endpoint, so the *same*
backend class serves ArvanCloud Object Storage in production and MinIO in local
development — only the endpoint/credentials/bucket differ, and those come from the
environment (wired up in ``config.settings`` in Step 3).

Routing summary (implemented in settings):
  * production  -> ``MediaS3Storage`` pointed at ArvanCloud
  * development -> ``MediaS3Storage`` pointed at MinIO, *or* Django's local
    ``FileSystemStorage`` when ``USE_S3`` is disabled, so a contributor can run the
    backend with zero external services.
"""

import posixpath
from uuid import uuid4

from django.core.exceptions import SuspiciousFileOperation
from storages.backends.s3boto3 import S3Boto3Storage
from storages.utils import clean_name


class MediaS3Storage(S3Boto3Storage):
    """Private media bucket for all user uploads.

    ``default_acl="private"`` + ``querystring_auth=True`` means objects are never
    publicly listable; the app hands out short-lived signed URLs instead — important
    because uploads include deeds, receipts and inspection photos. ``file_overwrite``
    is off so two uploads with the same name never clobber each other.
    """

    location = "media"
    file_overwrite = False
    default_acl = "private"
    querystring_auth = True

    def get_available_name(self, name, max_length=None):
        """Use unpredictable keys without requiring a pre-upload HeadObject.

        S3 returns 403 for a missing object when the key lacks ListBucket access.
        A random 128-bit name avoids that lookup without granting bucket listing,
        changing private ACLs, or overwriting a user's original filename.
        """
        directory, filename = posixpath.split(clean_name(name))
        extension = posixpath.splitext(filename)[1]
        key = posixpath.join(directory, f"{uuid4().hex}{extension}")
        if max_length is not None and len(key) > max_length:
            raise SuspiciousFileOperation("Upload path exceeds the field length limit.")
        return key
