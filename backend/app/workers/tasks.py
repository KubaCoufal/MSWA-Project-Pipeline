from __future__ import annotations

import os
import tempfile
from time import sleep

from app.core.config import settings
from app.db import session_scope
from app.enums import RunStatus
from app.models import Pipeline, Run
from app.services.runs import apply_status_transition


def _run_kaggle_analysis(kaggle_dataset: str) -> dict:
    import pandas as pd
    from kaggle.api.kaggle_api_extended import KaggleApiExtended

    api = KaggleApiExtended()
    api.authenticate()

    with tempfile.TemporaryDirectory() as tmp:
        api.dataset_download_files(kaggle_dataset, path=tmp, unzip=True, quiet=True)

        csv_files = sorted(f for f in os.listdir(tmp) if f.lower().endswith(".csv"))
        if not csv_files:
            raise ValueError(f"No CSV file found in Kaggle dataset '{kaggle_dataset}'.")

        df = pd.read_csv(os.path.join(tmp, csv_files[0]), low_memory=False)

        numeric_cols = df.select_dtypes(include="number").columns.tolist()[:10]
        stats: dict[str, dict] = {}
        for col in numeric_cols:
            desc = df[col].describe()
            stats[col] = {
                "count": int(desc["count"]),
                "mean": round(float(desc["mean"]), 4),
                "std": round(float(desc["std"]), 4),
                "min": round(float(desc["min"]), 4),
                "p25": round(float(desc["25%"]), 4),
                "p50": round(float(desc["50%"]), 4),
                "p75": round(float(desc["75%"]), 4),
                "max": round(float(desc["max"]), 4),
            }

        # Detect a datetime column to build a rolling-7 trend line
        trend: list[dict] = []
        datetime_col: str | None = None
        for col in df.select_dtypes(include="object").columns:
            try:
                parsed = pd.to_datetime(df[col], errors="coerce")
                if parsed.notna().mean() > 0.8:
                    datetime_col = col
                    break
            except Exception:
                continue

        if datetime_col and numeric_cols:
            value_col = numeric_cols[0]
            trend_df = df[[datetime_col, value_col]].copy()
            trend_df.columns = ["date", "value"]
            trend_df["date"] = pd.to_datetime(trend_df["date"], errors="coerce")
            trend_df = trend_df.dropna().sort_values("date")
            trend_df["rolling7d"] = trend_df["value"].rolling(7, min_periods=1).mean().round(4)

            step = max(1, len(trend_df) // 300)
            trend_df = trend_df.iloc[::step]

            trend = [
                {
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "value": round(float(row["value"]), 4),
                    "rolling7d": round(float(row["rolling7d"]), 4),
                }
                for _, row in trend_df.iterrows()
            ]

        return {
            "dataset": kaggle_dataset,
            "file": csv_files[0],
            "rowCount": len(df),
            "columns": df.columns.tolist(),
            "numericColumns": numeric_cols,
            "stats": stats,
            "trend": trend,
        }


def process_run(run_id: int) -> None:
    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None or run.status != RunStatus.PENDING:
            return
        pipeline = session.get(Pipeline, run.pipeline_id)
        kaggle_dataset = pipeline.kaggle_dataset if pipeline else None
        apply_status_transition(session, run, RunStatus.RUNNING)

    if kaggle_dataset:
        try:
            report = _run_kaggle_analysis(kaggle_dataset)
        except Exception as exc:
            with session_scope() as session:
                run = session.get(Run, run_id)
                if run is not None:
                    apply_status_transition(session, run, RunStatus.FAILED, error_message=str(exc))
            return

        with session_scope() as session:
            run = session.get(Run, run_id)
            if run is None or run.status != RunStatus.RUNNING:
                return
            run.report = report
            apply_status_transition(session, run, RunStatus.SUCCESS, records_processed=report["rowCount"])
    else:
        sleep(max(settings.simulation_runtime_seconds, 0))
        with session_scope() as session:
            run = session.get(Run, run_id)
            if run is None or run.status != RunStatus.RUNNING:
                return
            apply_status_transition(session, run, RunStatus.SUCCESS, records_processed=settings.default_records_processed)
