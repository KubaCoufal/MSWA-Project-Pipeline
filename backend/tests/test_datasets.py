from __future__ import annotations


def test_admin_can_create_and_list_datasets(client, admin_headers) -> None:
    response = client.post(
        "/datasets",
        headers=admin_headers,
        json={
            "name": "customer_transactions",
            "description": "Orders imported from the shop",
            "owner": "analytics-team",
            "schemaVersion": 3,
        },
    )

    assert response.status_code == 201
    assert response.json()["schemaVersion"] == 3

    list_response = client.get("/datasets", headers=admin_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_viewer_cannot_create_dataset(client, viewer_headers) -> None:
    response = client.post(
        "/datasets",
        headers=viewer_headers,
        json={"name": "logs", "owner": "ops-team", "schemaVersion": 1},
    )

    assert response.status_code == 403
