"""
Core app views.

Contains file upload and OAuth authentication functionality.
"""

import logging
import uuid
from urllib.parse import urlparse

from django.conf import settings
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import boto3
import httpx
from botocore.exceptions import ClientError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .feature_flags import get_all_flags
from .models import User
from .serializers import (
    ConversionEventSerializer,
    CredentialsLoginSerializer,
    CredentialsRegisterSerializer,
    ExposureEventSerializer,
    FeatureFlagsResponseSerializer,
    GitHubAuthSerializer,
    GoogleAuthSerializer,
    LogoutSerializer,
    TokenResponseSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

# Trusted hosts for avatar URLs from OAuth providers
TRUSTED_AVATAR_HOSTS = {
    "lh3.googleusercontent.com",  # Google
    "avatars.githubusercontent.com",  # GitHub
    "*.googleusercontent.com",  # Google (wildcard)
}


def validate_avatar_url(url: str) -> str:
    """
    Validate that an avatar URL is from a trusted OAuth provider host.

    Args:
        url: The avatar URL to validate

    Returns:
        The validated URL if trusted, empty string otherwise
    """
    if not url:
        return ""

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            logger.warning("Invalid avatar URL scheme: %s", url)
            return ""

        host = parsed.netloc.lower()

        # Check exact match
        if host in TRUSTED_AVATAR_HOSTS:
            return url

        # Check wildcard matches (e.g., *.googleusercontent.com)
        for trusted in TRUSTED_AVATAR_HOSTS:
            if trusted.startswith("*."):
                domain = trusted[2:]  # Remove "*."
                if host.endswith(domain) or host == domain:
                    return url

        logger.warning("Avatar URL from untrusted host: %s", host)
        return ""
    except Exception as e:
        logger.warning("Failed to parse avatar URL: %s - %s", url, str(e))
        return ""


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


class GoogleAuthView(APIView):
    """
    Exchange Google id_token for Django JWT tokens.

    Receives a Google id_token from the OAuth flow, verifies it,
    creates/retrieves the user, and returns Django JWT tokens.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Google OAuth login",
        description="Exchange Google id_token for Django JWT tokens",
        request=GoogleAuthSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description="Invalid token or missing data"),
            401: OpenApiResponse(description="Token verification failed"),
        },
    )
    def post(self, request):
        """Exchange Google id_token for JWT tokens."""
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data["id_token"]

        try:
            idinfo = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError as e:
            logger.warning("Google token verification failed: %s", str(e))
            return Response(
                {"error": "Invalid Google token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = idinfo.get("email")
        if not email:
            return Response(
                {"error": "Email not found in Google token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avatar_url = validate_avatar_url(idinfo.get("picture", ""))

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": idinfo.get("given_name", ""),
                "last_name": idinfo.get("family_name", ""),
                "avatar": avatar_url,
            },
        )

        if created:
            logger.info("New user created via Google OAuth: %s", email)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class GitHubAuthView(APIView):
    """
    Exchange GitHub access_token for Django JWT tokens.

    Receives a GitHub access_token from the OAuth flow, fetches user info
    from GitHub API, creates/retrieves the user, and returns Django JWT tokens.
    """

    permission_classes = [AllowAny]

    GITHUB_API_URL = "https://api.github.com"

    @extend_schema(
        summary="GitHub OAuth login",
        description="Exchange GitHub access_token for Django JWT tokens",
        request=GitHubAuthSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description="Invalid token or missing data"),
            401: OpenApiResponse(description="Failed to fetch GitHub user info"),
        },
    )
    def post(self, request):
        """Exchange GitHub access_token for JWT tokens."""
        serializer = GitHubAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        access_token = serializer.validated_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            with httpx.Client() as client:
                user_response = client.get(f"{self.GITHUB_API_URL}/user", headers=headers)
                user_response.raise_for_status()
                github_user = user_response.json()

                emails_response = client.get(f"{self.GITHUB_API_URL}/user/emails", headers=headers)
                emails_response.raise_for_status()
                emails = emails_response.json()

        except httpx.HTTPError as e:
            logger.warning("GitHub API request failed: %s", str(e))
            return Response(
                {"error": "Failed to fetch GitHub user info"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        primary_email = next(
            (e["email"] for e in emails if e.get("primary")),
            github_user.get("email"),
        )
        if not primary_email:
            return Response(
                {"error": "Could not determine user email from GitHub"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = github_user.get("name", "") or ""
        name_parts = name.split(maxsplit=1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        avatar_url = validate_avatar_url(github_user.get("avatar_url", ""))

        user, created = User.objects.get_or_create(
            email=primary_email,
            defaults={
                "username": primary_email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar": avatar_url,
            },
        )

        if created:
            logger.info("New user created via GitHub OAuth: %s", primary_email)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    """
    Blacklist a refresh token to logout the user.

    Uses AllowAny permission because:
    - Logout should work even if access token is expired
    - The refresh token in the request body is sufficient for authorization
    - Blacklisting an already-invalid token is harmless
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Logout",
        description="Blacklist the refresh token to logout",
        request=LogoutSerializer,
        responses={
            204: OpenApiResponse(description="Successfully logged out"),
            400: OpenApiResponse(description="Invalid request body"),
        },
    )
    def post(self, request):
        """Blacklist the refresh token."""
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            # Token already invalid or blacklisted - this is fine for logout
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    """
    Get current authenticated user info.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get current user",
        description="Get information about the currently authenticated user",
        responses={200: UserSerializer},
    )
    def get(self, request):
        """Return the current user's information."""
        return Response(UserSerializer(request.user).data)


def is_credentials_auth_enabled() -> bool:
    """Check if credentials authentication is enabled via environment variable."""
    return settings.ENABLE_CREDENTIALS_AUTH


class CredentialsLoginView(APIView):
    """
    Login with email and password.

    Only available when ENABLE_CREDENTIALS_AUTH=true.
    Useful for testing and development without OAuth providers.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Login with credentials",
        description="Login with email and password. Only available when ENABLE_CREDENTIALS_AUTH=true.",
        request=CredentialsLoginSerializer,
        responses={
            200: TokenResponseSerializer,
            400: OpenApiResponse(description="Invalid credentials or missing data"),
            403: OpenApiResponse(description="Credentials auth is disabled"),
        },
    )
    def post(self, request):
        """Login with email and password."""
        if not is_credentials_auth_enabled():
            return Response(
                {"error": "Credentials authentication is disabled"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CredentialsLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning("Login attempt for non-existent user: %s", email)
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            logger.warning("Invalid password for user: %s", email)
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"error": "User account is disabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("User logged in via credentials: %s", email)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class CredentialsRegisterView(APIView):
    """
    Register a new user with email and password.

    Only available when ENABLE_CREDENTIALS_AUTH=true.
    Useful for testing and development without OAuth providers.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Register with credentials",
        description="Register a new user with email and password. Only available when ENABLE_CREDENTIALS_AUTH=true.",
        request=CredentialsRegisterSerializer,
        responses={
            201: TokenResponseSerializer,
            400: OpenApiResponse(description="Invalid data or user already exists"),
            403: OpenApiResponse(description="Credentials auth is disabled"),
        },
    )
    def post(self, request):
        """Register a new user with email and password."""
        if not is_credentials_auth_enabled():
            return Response(
                {"error": "Credentials authentication is disabled"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CredentialsRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "User with this email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        logger.info("New user registered via credentials: %s", email)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class FeatureFlagsView(APIView):
    """
    Get feature flags and experiment variants for the current user.

    Backend is the source of truth for all feature flags and experiments.
    Frontend should call this endpoint on app initialization to bootstrap
    feature flags state.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get feature flags",
        description="Get all feature flags and experiment variants for the current user",
        responses={200: FeatureFlagsResponseSerializer},
        tags=["feature-flags"],
    )
    def get(self, request):
        """Return feature flags and experiment variants."""
        user = request.user if request.user.is_authenticated else None
        flags_data = get_all_flags(user)
        return Response(flags_data)


class ExposureEventView(APIView):
    """
    Record experiment exposure events.

    Called when a user is exposed to an experiment variant.
    Events are deduplicated by experiment + user on the frontend,
    but backend can also implement deduplication if needed.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Record exposure event",
        description="Record that a user was exposed to an experiment variant",
        request=ExposureEventSerializer,
        responses={201: None},
        tags=["analytics"],
    )
    def post(self, request):
        """Record an exposure event."""
        serializer = ExposureEventSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.user.id if request.user.is_authenticated else None
        experiment = serializer.validated_data["experiment"]
        variant = serializer.validated_data["variant"]
        session_id = serializer.validated_data.get("session_id", "")

        logger.info(
            "Exposure event: experiment=%s variant=%s user_id=%s session_id=%s",
            experiment,
            variant,
            user_id,
            session_id,
        )

        return Response(status=status.HTTP_201_CREATED)


class ConversionEventView(APIView):
    """
    Record conversion events linked to experiments.

    Called when a user performs a conversion action (click, booking, etc.)
    while participating in an experiment.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Record conversion event",
        description="Record a conversion event linked to an experiment",
        request=ConversionEventSerializer,
        responses={201: None},
        tags=["analytics"],
    )
    def post(self, request):
        """Record a conversion event."""
        serializer = ConversionEventSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.user.id if request.user.is_authenticated else None
        experiment = serializer.validated_data["experiment"]
        variant = serializer.validated_data["variant"]
        metric = serializer.validated_data["metric"]
        metadata = serializer.validated_data.get("metadata", {})

        logger.info(
            "Conversion event: experiment=%s variant=%s metric=%s user_id=%s metadata=%s",
            experiment,
            variant,
            metric,
            user_id,
            metadata,
        )

        return Response(status=status.HTTP_201_CREATED)
