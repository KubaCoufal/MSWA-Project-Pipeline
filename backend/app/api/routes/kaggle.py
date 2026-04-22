from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user

router = APIRouter(prefix="/kaggle", tags=["kaggle"], dependencies=[Depends(get_current_user)])


@router.get("/datasets")
def search_kaggle_datasets(q: str = Query(min_length=3, max_length=100)) -> list[dict]:
    try:
        from kaggle.api.kaggle_api_extended import KaggleApiExtended

        api = KaggleApiExtended()
        api.authenticate()
        results = api.dataset_list(search=q, page_size=10)
        return [
            {
                "ref": dataset.ref,
                "title": dataset.title,
                "ownerName": dataset.ownerName,
                "totalBytes": dataset.totalBytes,
                "downloadCount": getattr(dataset, "downloadCount", 0),
                "lastUpdated": str(dataset.lastUpdated) if dataset.lastUpdated else None,
            }
            for dataset in results
        ]
    except Exception:
        # Credentials not configured or API unavailable — degrade gracefully
        return []
