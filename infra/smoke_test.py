from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request


API_BASE_URL = "http://localhost:8000"
ADMIN_USER_ID = 1
ADMIN_TOKEN: str | None = None


def get_admin_token() -> str:
    global ADMIN_TOKEN
    if ADMIN_TOKEN is not None:
        return ADMIN_TOKEN

    data = json.dumps({"userId": ADMIN_USER_ID}).encode("utf-8")
    request = urllib.request.Request(
        f"{API_BASE_URL}/auth/demo-token",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        payload = json.loads(response.read().decode("utf-8"))
    ADMIN_TOKEN = payload["accessToken"]
    return ADMIN_TOKEN


def request_json(method: str, path: str, payload: dict | None = None):
    data = None
    headers = {"Authorization": f"Bearer {get_admin_token()}"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(f"{API_BASE_URL}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_run(run_id: int, timeout_seconds: int = 20) -> dict:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        run = request_json("GET", f"/runs/{run_id}")
        if run["status"] in {"success", "failed"}:
            return run
        time.sleep(1)
    raise TimeoutError(f"Run {run_id} did not finish within {timeout_seconds} seconds.")


def main() -> None:
    dataset = request_json(
        "POST",
        "/datasets",
        {
            "name": f"smoke-dataset-{int(time.time())}",
            "description": "Smoke test dataset",
            "owner": "qa-team",
            "schemaVersion": 1,
        },
    )
    print(f"Created dataset #{dataset['id']}")

    pipeline = request_json(
        "POST",
        "/pipelines",
        {
            "datasetId": dataset["id"],
            "name": f"smoke-pipeline-{int(time.time())}",
            "description": "Smoke test pipeline",
            "schedule": "0 2 * * *",
            "active": True,
            "sourceType": "simulated",
        },
    )
    print(f"Created pipeline #{pipeline['id']}")

    rule = request_json(
        "POST",
        "/alert-rules",
        {
            "pipelineId": pipeline["id"],
            "name": "Smoke runtime rule",
            "ruleType": "runtime_exceeded",
            "thresholdSeconds": 1,
            "severity": "medium",
            "enabled": True,
        },
    )
    print(f"Created alert rule #{rule['id']}")

    run = request_json("POST", f"/pipelines/{pipeline['id']}/run")
    print(f"Started run #{run['id']}")

    finished_run = wait_for_run(run["id"])
    print(f"Run #{finished_run['id']} finished with status {finished_run['status']}")

    alerts = request_json("GET", f"/alerts?{urllib.parse.urlencode({'pipeline_id': pipeline['id']})}")
    if not alerts:
        raise AssertionError("Expected at least one alert from the runtime threshold smoke test.")

    print(f"Smoke test passed with {len(alerts)} alert(s).")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        raise SystemExit(f"HTTP error {error.code}: {body}") from error
