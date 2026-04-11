from __future__ import annotations

import pytest

from app.core.config import settings
from app.core.security import AuthenticatedUser
from app.enums import UserRole


def test_operator_cannot_create_pipeline(client, operator_headers) -> None:
    response = client.post(
        "/pipelines",
        headers=operator_headers,
        json={
            "datasetId": 1,
            "name": "blocked-pipeline",
            "description": "Should not be allowed",
            "active": True,
        },
    )

    assert response.status_code == 403


def test_demo_users_endpoint_is_available(client, admin_headers) -> None:
    response = client.get("/meta/demo-users", headers=admin_headers)
    assert response.status_code == 200
    assert [user["role"] for user in response.json()] == ["admin", "operator", "viewer"]


@pytest.mark.parametrize(
    "path",
    [
        "/dashboard/summary",
        "/datasets",
        "/pipelines",
        "/runs",
        "/alert-rules",
        "/alerts",
    ],
)
def test_keycloak_mode_requires_bearer_token_for_app_routes(client, monkeypatch, path: str) -> None:
    monkeypatch.setattr(settings, "auth_mode", "keycloak")

    response = client.get(path)

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token."


def test_health_remains_public_in_keycloak_mode(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_mode", "keycloak")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_demo_users_metadata_is_hidden_in_keycloak_mode(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "auth_mode", "keycloak")
    monkeypatch.setattr(
        "app.core.security.get_keycloak_user",
        lambda authorization: AuthenticatedUser(
            id="kc-user",
            email="admin@pipeline.local",
            display_name="Keycloak Admin",
            role=UserRole.ADMIN,
            auth_mode="keycloak",
        ),
    )

    response = client.get("/meta/demo-users", headers={"Authorization": "Bearer fake-token"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Demo users metadata is only available in demo auth mode."
