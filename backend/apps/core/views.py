"""
Core app views.

Contains file upload functionality for MinIO/S3 storage.
"""

import logging
import uuid

from django.conf import settings
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class FileUploadView(APIView):
    """
    Handle file uploads to MinIO/S3 storage.

    Accepts multipart form data with a 'file' field and uploads it to the
    configured MinIO bucket. Returns the public URL of the uploaded file.
    """

    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    # Allowed folder paths for uploads (whitelist approach)
    ALLOWED_FOLDERS = {"avatars", "uploads", "documents"}

    def _get_s3_client(self):
        """Create and return an S3 client configured for MinIO."""
        return boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
        )

    def _validate_file(self, file):
        """
        Validate file size and content type.

        Args:
            file: The uploaded file object

        Returns:
            tuple: (is_valid, error_message)
        """
        if file.size > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            return False, f"File size exceeds maximum allowed ({max_mb:.0f}MB)"

        if file.content_type not in settings.ALLOWED_UPLOAD_TYPES:
            return False, f"File type '{file.content_type}' is not allowed"

        # Validate file extension matches content type
        extension = file.name.split(".")[-1].lower() if "." in file.name else ""
        content_type_extensions = {
            "image/jpeg": ["jpg", "jpeg"],
            "image/png": ["png"],
            "image/gif": ["gif"],
            "image/webp": ["webp"],
            "application/pdf": ["pdf"],
        }
        expected_extensions = content_type_extensions.get(file.content_type, [])
        if expected_extensions and extension not in expected_extensions:
            return (
                False,
                f"File extension '.{extension}' does not match content type '{file.content_type}'",
            )

        return True, None

    def _validate_folder(self, folder: str) -> tuple[bool, str | None]:
        """
        Validate folder path against whitelist.

        Args:
            folder: The requested folder path

        Returns:
            tuple: (is_valid, error_message)
        """
        # Prevent path traversal
        if ".." in folder or folder.startswith("/"):
            return False, "Invalid folder path"

        # Check against whitelist
        base_folder = folder.split("/")[0]
        if base_folder not in self.ALLOWED_FOLDERS:
            return (
                False,
                f"Folder '{base_folder}' is not allowed. Allowed: {', '.join(self.ALLOWED_FOLDERS)}",
            )

        return True, None

    def _ensure_bucket_exists(self, s3_client):
        """Create the bucket if it doesn't exist."""
        try:
            s3_client.head_bucket(Bucket=settings.MINIO_BUCKET)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404":
                logger.info("Creating bucket: %s", settings.MINIO_BUCKET)
                s3_client.create_bucket(Bucket=settings.MINIO_BUCKET)
            else:
                raise

    @extend_schema(
        summary="Upload a file",
        description="Upload a file to MinIO storage. Returns the public URL.",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "file": {"type": "string", "format": "binary"},
                    "folder": {"type": "string", "description": "Optional folder path"},
                },
                "required": ["file"],
            }
        },
        responses={
            201: OpenApiResponse(
                description="File uploaded successfully",
                examples=[
                    OpenApiExample(
                        name="Success",
                        value={
                            "url": "http://localhost:9000/tutors-media/avatars/abc123/image.jpg"
                        },
                    )
                ],
            ),
            400: OpenApiResponse(description="Invalid file or validation error"),
            500: OpenApiResponse(description="Upload failed"),
        },
    )
    def post(self, request):
        """Handle file upload."""
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file
        is_valid, error_message = self._validate_file(file)
        if not is_valid:
            return Response(
                {"error": error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get and validate folder parameter
        folder = request.data.get("folder", "uploads")
        is_valid_folder, folder_error = self._validate_folder(folder)
        if not is_valid_folder:
            return Response(
                {"error": folder_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate unique file key
        unique_id = uuid.uuid4().hex[:12]
        file_extension = file.name.split(".")[-1] if "." in file.name else ""
        safe_filename = f"{unique_id}.{file_extension}" if file_extension else unique_id
        key = f"{folder}/{safe_filename}"

        try:
            s3_client = self._get_s3_client()

            # Ensure bucket exists
            self._ensure_bucket_exists(s3_client)

            # Upload file
            s3_client.upload_fileobj(
                file,
                settings.MINIO_BUCKET,
                key,
                ExtraArgs={"ContentType": file.content_type},
            )

            # Construct public URL
            url = f"{settings.MINIO_PUBLIC_URL}/{settings.MINIO_BUCKET}/{key}"

            logger.info("File uploaded successfully: %s", key)
            return Response({"url": url}, status=status.HTTP_201_CREATED)

        except ClientError as e:
            logger.exception("S3 upload error: %s", str(e))
            return Response(
                {"error": "File upload failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.exception("Unexpected upload error: %s", str(e))
            return Response(
                {"error": "File upload failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
