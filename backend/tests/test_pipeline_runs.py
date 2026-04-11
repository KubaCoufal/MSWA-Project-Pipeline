from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.workers.tasks import process_run


def create_dataset(client, admin_headers) -> int:
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
    return response.json()["id"]


def create_pipeline(client, admin_headers, dataset_id: int, *, active: bool = True) -> int:
    response = client.post(
        "/pipelines",
        headers=admin_headers,
        json={
            "datasetId": dataset_id,
            "name": f"daily-aggregation-{dataset_id}-{active}",
            "description": "Aggregate daily revenue",
            "schedule": "0 2 * * *",
            "active": active,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_pipeline_creation_requires_existing_dataset(client, admin_headers) -> None:
    response = client.post(
        "/pipelines",
        headers=admin_headers,
        json={
            "datasetId": 9999,
            "name": "daily-aggregation",
            "description": "Aggregate daily revenue",
            "schedule": "0 2 * * *",
            "active": True,
        },
    )

    assert response.status_code == 404


def test_pipeline_creation_rejects_invalid_schedule(client, admin_headers) -> None:
    dataset_id = create_dataset(client, admin_headers)

    response = client.post(
        "/pipelines",
        headers=admin_headers,
        json={
            "datasetId": dataset_id,
            "name": "invalid-schedule-pipeline",
            "description": "Should be rejected",
            "schedule": "not-a-cron-expression",
            "active": True,
        },
    )

    assert response.status_code == 422
    assert "valid cron expression" in response.text


def test_admin_can_update_pipeline_metadata(client, admin_headers) -> None:
    dataset_id = create_dataset(client, admin_headers)
    pipeline_id = create_pipeline(client, admin_headers, dataset_id)

    response = client.patch(
        f"/pipelines/{pipeline_id}",
        headers=admin_headers,
        json={
            "name": "daily-aggregation-updated",
            "description": "Updated pipeline description",
            "schedule": "0 4 * * *",
            "active": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "daily-aggregation-updated"
    assert response.json()["schedule"] == "0 4 * * *"
    assert response.json()["active"] is False


def test_operator_cannot_update_pipeline_metadata(client, admin_headers, operator_headers) -> None:
    dataset_id = create_dataset(client, admin_headers)
    pipeline_id = create_pipeline(client, admin_headers, dataset_id)

    response = client.patch(
        f"/pipelines/{pipeline_id}",
        headers=operator_headers,
        json={"active": False},
    )

    assert response.status_code == 403


def test_inactive_pipeline_cannot_run(client, admin_headers, operator_headers, monkeypatch) -> None:
    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)
    dataset_id = create_dataset(client, admin_headers)
    pipeline_id = create_pipeline(client, admin_headers, dataset_id, active=False)

    response = client.post(f"/pipelines/{pipeline_id}/run", headers=operator_headers)
    assert response.status_code == 409


def test_run_transition_rules_and_failed_alert(client, admin_headers, operator_headers, monkeypatch) -> None:
    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)
    dataset_id = create_dataset(client, admin_headers)
    pipeline_id = create_pipeline(client, admin_headers, dataset_id)

    rule_response = client.post(
        "/alert-rules",
        headers=admin_headers,
        json={
            "pipelineId": pipeline_id,
            "name": "Failure rule",
            "ruleType": "run_failed",
            "severity": "high",
            "enabled": True,
        },
    )
    assert rule_response.status_code == 201

    run_response = client.post(f"/pipelines/{pipeline_id}/run", headers=operator_headers)
    assert run_response.status_code == 201
    run_id = run_response.json()["id"]

    invalid_transition = client.patch(
        f"/runs/{run_id}",
        headers=operator_headers,
        json={"status": "success"},
    )
    assert invalid_transition.status_code == 422

    running_transition = client.patch(
        f"/runs/{run_id}",
        headers=operator_headers,
        json={"status": "running"},
    )
    assert running_transition.status_code == 200

    failed_transition = client.patch(
        f"/runs/{run_id}",
        headers=operator_headers,
        json={"status": "failed", "errorMessage": "Warehouse timeout"},
    )
    assert failed_transition.status_code == 200
    assert failed_transition.json()["status"] == "failed"

    alerts_response = client.get(f"/alerts?pipeline_id={pipeline_id}")
    assert alerts_response.status_code == 200
    assert len(alerts_response.json()) == 1


def test_worker_processes_run_and_runtime_alert(client, admin_headers, operator_headers, monkeypatch) -> None:
    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)
    monkeypatch.setattr("app.workers.tasks.sleep", lambda _: None)

    class FakeDateTime:
        calls = 0

        @classmethod
        def now(cls, tz=None):
            base = datetime(2026, 1, 1, tzinfo=timezone.utc)
            offset = timedelta(seconds=3 if cls.calls else 0)
            cls.calls += 1
            return base + offset

    monkeypatch.setattr("app.services.runs.datetime", FakeDateTime)

    dataset_id = create_dataset(client, admin_headers)
    pipeline_id = create_pipeline(client, admin_headers, dataset_id)

    rule_response = client.post(
        "/alert-rules",
        headers=admin_headers,
        json={
            "pipelineId": pipeline_id,
            "name": "Slow runtime",
            "ruleType": "runtime_exceeded",
            "thresholdSeconds": 1,
            "severity": "medium",
            "enabled": True,
        },
    )
    assert rule_response.status_code == 201

    run_response = client.post(f"/pipelines/{pipeline_id}/run", headers=operator_headers)
    run_id = run_response.json()["id"]

    process_run(run_id)

    fetched_run = client.get(f"/runs/{run_id}")
    assert fetched_run.status_code == 200
    assert fetched_run.json()["status"] == "success"

    alerts_response = client.get(f"/alerts?pipeline_id={pipeline_id}")
    assert alerts_response.status_code == 200
    assert len(alerts_response.json()) == 1
