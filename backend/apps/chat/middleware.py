"""
WebSocket authentication middleware for Django Channels.

SECURITY NOTE:
JWT tokens are passed via query parameters in WebSocket connections.
This is a common pattern for WebSocket auth but has security implications:
- Tokens may appear in server logs
- Tokens may be cached by proxies
- Tokens appear in browser history

Mitigations in place:
- Access tokens have short TTL (15 minutes)
- HTTPS should always be used in production
- Tokens are validated server-side

Future improvements could include:
- Cookie-based authentication
- WebSocket subprotocol authentication
- One-time connection tokens
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.models import User


@database_sync_to_async
def get_user_from_token(token_key: str) -> User | AnonymousUser:
    """Validate JWT token and return user."""
    try:
        access_token = AccessToken(token_key)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware to authenticate WebSocket connections using JWT tokens.
    Token is passed as query parameter: ws://host/ws/chat/room_id/?token=xxx

    WARNING: Query parameter authentication has security implications.
    See module docstring for details and mitigations.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])

        if token_list:
            token = token_list[0]
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
