import io
from unittest.mock import MagicMock, PropertyMock, patch

from django.core.exceptions import SuspiciousFileOperation
from django.core.files.base import File
from django.test import SimpleTestCase

from apps.common.storages import MediaS3Storage


class MediaStorageTests(SimpleTestCase):
    def storage(self):
        return MediaS3Storage(access_key="test", secret_key="test", bucket_name="test")

    def test_upload_uses_unique_keys_without_head_or_list_permissions(self):
        storage = self.storage()
        with patch.object(storage, "exists", side_effect=AssertionError("No HeadObject permitted")):
            first = storage.get_available_name("website/partners/نام شرکت.png", max_length=100)
            second = storage.get_available_name("website/partners/نام شرکت.png", max_length=100)
        self.assertNotEqual(first, second)
        self.assertRegex(first, r"^website/partners/[a-f0-9]{32}\.png$")
        self.assertLessEqual(len(first), 100)
        self.assertFalse(storage.file_overwrite)

    def test_save_still_uploads_privately_under_media_prefix(self):
        storage = self.storage()
        bucket = MagicMock()
        with patch.object(MediaS3Storage, "bucket", new_callable=PropertyMock, return_value=bucket), patch.object(storage, "exists", side_effect=AssertionError("No HeadObject permitted")):
            name = storage.save("website/partners/logo.png", File(io.BytesIO(b"image bytes")), max_length=100)
        bucket.Object.assert_called_once_with("media/" + name)
        upload = bucket.Object.return_value.upload_fileobj
        upload.assert_called_once()
        self.assertEqual(upload.call_args.kwargs["ExtraArgs"]["ACL"], "private")
        self.assertTrue(storage.querystring_auth)

    def test_long_paths_fail_without_shortening_the_random_key(self):
        with self.assertRaises(SuspiciousFileOperation):
            self.storage().get_available_name("website/partners/logo.png", max_length=35)
