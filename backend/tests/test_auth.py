from __future__ import annotations


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


def test_demo_users_endpoint_is_available(client) -> None:
    response = client.get("/meta/demo-users")
    assert response.status_code == 200
    assert [user["role"] for user in response.json()] == ["admin", "operator", "viewer"]
