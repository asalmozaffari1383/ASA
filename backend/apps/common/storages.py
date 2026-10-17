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

from storages.backends.s3boto3 import S3Boto3Storage


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
