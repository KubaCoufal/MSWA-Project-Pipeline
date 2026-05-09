from __future__ import annotations

import math
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Callable

import pandas as pd

from app.core.config import settings


KAGGLE_DATASET_URL_RE = re.compile(r"kaggle\.com/(?:datasets/)?(?P<owner>[^/\s]+)/(?P<slug>[^/?#\s]+)")


def normalize_dataset_ref(value: str) -> str:
    stripped = value.strip()
    match = KAGGLE_DATASET_URL_RE.search(stripped)
    if match:
        return f"{match.group('owner')}/{match.group('slug')}"
    if re.fullmatch(r"[^/\s]+/[^/\s]+", stripped):
        return stripped
    raise ValueError("Kaggle dataset must be a dataset URL or owner/dataset slug.")


def resolve_latest_dataset_ref() -> str:
    api = _authenticated_api()
    datasets = api.dataset_list(sort_by="published", file_type="csv", page=1, max_size=_max_download_bytes())
    if not datasets:
        raise RuntimeError("Kaggle did not return any recent CSV datasets within the configured size limit.")

    dataset_ref = getattr(datasets[0], "ref", None)
    if not dataset_ref:
        raise RuntimeError("Kaggle returned a dataset without a usable reference.")
    return dataset_ref


def resolve_latest_dataset_ref_for_category(category: str) -> str:
    normalized = category.strip()
    if not normalized:
        raise RuntimeError("A Kaggle topic or category is required.")

    api = _authenticated_api()
    search_candidates = [
        {"tag_ids": normalized},
        {"search": normalized},
        {"search": normalized.replace("-", " ")},
    ]

    for filters in search_candidates:
        datasets = api.dataset_list(
            sort_by="published",
            file_type="csv",
            page=1,
            max_size=_max_download_bytes(),
            **filters,
        )
        if datasets:
            dataset_ref = getattr(datasets[0], "ref", None)
            if dataset_ref:
                return dataset_ref

    raise RuntimeError(f"Kaggle did not return a recent CSV dataset for topic '{normalized}'.")


StepCallback = Callable[[str, str, dict | None], None]


def run_kaggle_eda(
    source_type: str,
    kaggle_dataset_ref: str | None = None,
    kaggle_category: str | None = None,
    on_step: StepCallback | None = None,
) -> tuple[dict[str, Any], int]:
    _emit(on_step, "resolve_source", "running", None)
    if source_type == "kaggle_latest":
        dataset_ref = resolve_latest_dataset_ref()
    elif source_type == "kaggle_latest_category":
        dataset_ref = resolve_latest_dataset_ref_for_category(kaggle_category or "")
    else:
        dataset_ref = normalize_dataset_ref(kaggle_dataset_ref or "")
    _emit(on_step, "resolve_source", "success", {"datasetRef": dataset_ref})

    with tempfile.TemporaryDirectory(prefix="pipeline-monitor-kaggle-") as temp_dir:
        api = _authenticated_api()
        _emit(on_step, "download_dataset", "running", {"datasetRef": dataset_ref})
        api.dataset_download_files(dataset=dataset_ref, path=temp_dir, quiet=True, unzip=True)
        _emit(on_step, "download_dataset", "success", {"path": temp_dir})

        _emit(on_step, "discover_csv_files", "running", None)
        csv_files = sorted(Path(temp_dir).rglob("*.csv"))
        if not csv_files:
            raise RuntimeError(f"Kaggle dataset {dataset_ref} did not contain any CSV files.")
        _emit(on_step, "discover_csv_files", "success", {"csvFiles": len(csv_files)})

        _emit(on_step, "profile_csv_files", "running", {"csvFiles": min(len(csv_files), 5)})
        files = [_profile_csv(csv_file) for csv_file in csv_files[:5]]
        records_processed = sum(file_result["rowCount"] for file_result in files)
        _emit(on_step, "profile_csv_files", "success", {"filesProfiled": len(files), "recordsProcessed": records_processed})

    return (
        {
            "sourceType": source_type,
            "datasetRef": dataset_ref,
            "category": kaggle_category,
            "datasetUrl": f"https://www.kaggle.com/datasets/{dataset_ref}",
            "fileCount": len(files),
            "files": files,
        },
        records_processed,
    )


def _emit(on_step: StepCallback | None, name: str, status: str, metrics: dict | None) -> None:
    if on_step is not None:
        on_step(name, status, metrics)


def _authenticated_api():
    if not settings.kaggle_username or not settings.kaggle_key:
        raise RuntimeError("Kaggle credentials are missing. Set KAGGLE_USERNAME and KAGGLE_KEY for the backend and worker.")

    os.environ["KAGGLE_USERNAME"] = settings.kaggle_username
    os.environ["KAGGLE_KEY"] = settings.kaggle_key

    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    return api


def _max_download_bytes() -> int:
    return max(settings.kaggle_max_download_mb, 1) * 1024 * 1024


def _profile_csv(csv_file: Path) -> dict[str, Any]:
    frame = pd.read_csv(csv_file, low_memory=False)
    numeric_frame = frame.select_dtypes(include="number")
    categorical_frame = frame.select_dtypes(exclude="number")

    missing = frame.isna().sum().sort_values(ascending=False)
    numeric_summary = numeric_frame.describe().transpose() if not numeric_frame.empty else pd.DataFrame()

    return {
        "fileName": csv_file.name,
        "rowCount": int(len(frame)),
        "columnCount": int(len(frame.columns)),
        "columns": [
            {"name": column, "dtype": str(dtype), "missing": int(missing.get(column, 0))}
            for column, dtype in frame.dtypes.items()
        ],
        "missingValues": {str(column): int(value) for column, value in missing.items()},
        "duplicateRows": int(frame.duplicated().sum()),
        "numericSummary": {
            str(column): {
                "mean": _clean_number(row.get("mean")),
                "min": _clean_number(row.get("min")),
                "max": _clean_number(row.get("max")),
                "std": _clean_number(row.get("std")),
            }
            for column, row in numeric_summary.iterrows()
        },
        "categoricalSummary": {
            str(column): {str(value): int(count) for value, count in categorical_frame[column].value_counts(dropna=True).head(5).items()}
            for column in categorical_frame.columns[:20]
        },
        "sampleRows": _json_safe(frame.head(5).where(pd.notnull(frame), None).to_dict(orient="records")),
    }


def _clean_number(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    result = float(value)
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if value is None:
        return None
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value
