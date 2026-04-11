from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_session
from app.enums import UserRole
from app.models import User


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None
    display_name: str
    role: UserRole
    auth_mode: str


KEYCLOAK_ROLE_MAP: tuple[tuple[UserRole, set[str]], ...] = (
    (UserRole.ADMIN, {"pipeline-admin", "admin"}),
    (UserRole.OPERATOR, {"pipeline-operator", "operator"}),
    (UserRole.VIEWER, {"pipeline-viewer", "viewer"}),
)


@lru_cache
def get_jwk_client(jwks_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(jwks_url)


def resolve_keycloak_role(claims: dict) -> UserRole:
    roles = set(claims.get("realm_access", {}).get("roles", []))
    for role, aliases in KEYCLOAK_ROLE_MAP:
        if roles & aliases:
            return role

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No mapped Keycloak role was found for this account.",
    )


def get_demo_user(session: Session, demo_user_id: int | None) -> AuthenticatedUser:
    user_id = demo_user_id or 1
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown demo user.")

    return AuthenticatedUser(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        auth_mode="demo",
    )


def _extract_bearer_token(authorization: str | None) -> str:
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token header.")
    return token


def get_keycloak_user(authorization: str | None) -> AuthenticatedUser:
    token = _extract_bearer_token(authorization)
    try:
        signing_key = get_jwk_client(settings.keycloak_jwks_url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.keycloak_issuer_url,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Keycloak token.") from exc

    authorized_party = claims.get("azp")
    audience = claims.get("aud", [])
    normalized_audience = set(audience if isinstance(audience, list) else [audience])
    if settings.keycloak_client_id not in normalized_audience and authorized_party != settings.keycloak_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token audience does not match client.")

    role = resolve_keycloak_role(claims)
    return AuthenticatedUser(
        id=str(claims.get("sub", "")),
        email=claims.get("email"),
        display_name=claims.get("preferred_username") or claims.get("name") or "Keycloak user",
        role=role,
        auth_mode="keycloak",
    )


def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    demo_user_id: Annotated[int | None, Header(alias="X-Demo-User-Id")] = None,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> AuthenticatedUser:
    if settings.auth_mode == "keycloak":
        return get_keycloak_user(authorization)
    return get_demo_user(session, demo_user_id)


def require_roles(*roles: UserRole) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    def dependency(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> AuthenticatedUser:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this action.")
        return current_user

    return dependency
