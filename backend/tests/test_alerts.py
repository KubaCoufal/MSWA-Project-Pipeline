from __future__ import annotations


def create_alert(client, admin_headers, operator_headers, monkeypatch) -> int:
    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)

    dataset_response = client.post(
        "/datasets",
        headers=admin_headers,
        json={
            "name": "alert-test-dataset",
            "description": "Dataset for alert tests",
            "owner": "qa-team",
            "schemaVersion": 1,
        },
    )
    dataset_id = dataset_response.json()["id"]

    pipeline_response = client.post(
        "/pipelines",
        headers=admin_headers,
        json={
            "datasetId": dataset_id,
            "name": "alert-test-pipeline",
            "description": "Pipeline for alert tests",
            "schedule": "0 1 * * *",
            "active": True,
        },
    )
    pipeline_id = pipeline_response.json()["id"]

    rule_response = client.post(
        "/alert-rules",
        headers=admin_headers,
        json={
            "pipelineId": pipeline_id,
            "name": "Failure alert",
            "ruleType": "run_failed",
            "severity": "high",
            "enabled": True,
        },
    )
    assert rule_response.status_code == 201

    run_response = client.post(f"/pipelines/{pipeline_id}/run", headers=operator_headers)
    run_id = run_response.json()["id"]

    client.patch(f"/runs/{run_id}", headers=operator_headers, json={"status": "running"})
    failed_response = client.patch(
        f"/runs/{run_id}",
        headers=operator_headers,
        json={"status": "failed", "errorMessage": "Test failure"},
    )
    assert failed_response.status_code == 200

    alerts_response = client.get(f"/alerts?pipeline_id={pipeline_id}", headers=operator_headers)
    assert alerts_response.status_code == 200
    return alerts_response.json()[0]["id"]


def test_operator_can_acknowledge_and_admin_can_resolve_alert(
    client, admin_headers, operator_headers, monkeypatch
) -> None:
    alert_id = create_alert(client, admin_headers, operator_headers, monkeypatch)

    acknowledge_response = client.patch(
        f"/alerts/{alert_id}",
        headers=operator_headers,
        json={"status": "acknowledged"},
    )
    assert acknowledge_response.status_code == 200
    assert acknowledge_response.json()["status"] == "acknowledged"

    resolved_response = client.patch(
        f"/alerts/{alert_id}",
        headers=admin_headers,
        json={"status": "resolved"},
    )
    assert resolved_response.status_code == 200
    assert resolved_response.json()["status"] == "resolved"


def test_viewer_cannot_update_alert(client, admin_headers, operator_headers, viewer_headers, monkeypatch) -> None:
    alert_id = create_alert(client, admin_headers, operator_headers, monkeypatch)

    response = client.patch(
        f"/alerts/{alert_id}",
        headers=viewer_headers,
        json={"status": "acknowledged"},
    )

    assert response.status_code == 403


def test_invalid_alert_status_transition_is_rejected(
    client, admin_headers, operator_headers, monkeypatch
) -> None:
    alert_id = create_alert(client, admin_headers, operator_headers, monkeypatch)

    acknowledge_response = client.patch(
        f"/alerts/{alert_id}",
        headers=operator_headers,
        json={"status": "acknowledged"},
    )
    assert acknowledge_response.status_code == 200

    invalid_response = client.patch(
        f"/alerts/{alert_id}",
        headers=admin_headers,
        json={"status": "open"},
    )

    assert invalid_response.status_code == 422
    assert "Invalid alert status transition" in invalid_response.json()["detail"]
