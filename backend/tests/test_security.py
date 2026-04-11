from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core.security import resolve_keycloak_role
from app.enums import UserRole


def test_resolve_keycloak_role_prefers_highest_privilege() -> None:
    claims = {"realm_access": {"roles": ["pipeline-viewer", "pipeline-admin"]}}

    assert resolve_keycloak_role(claims) == UserRole.ADMIN


def test_resolve_keycloak_role_rejects_unmapped_roles() -> None:
    claims = {"realm_access": {"roles": ["offline_access"]}}

    with pytest.raises(HTTPException) as exc:
        resolve_keycloak_role(claims)

    assert exc.value.status_code == 403
