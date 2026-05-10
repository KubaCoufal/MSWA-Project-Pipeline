from __future__ import annotations


def test_request_id_header_is_returned(client, admin_headers) -> None:
    response = client.get("/dashboard/summary", headers={**admin_headers, "X-Request-ID": "test-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"


def test_metrics_endpoint_exposes_prometheus_metrics(client) -> None:
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "pipeline_monitor_http_requests_total" in response.text
