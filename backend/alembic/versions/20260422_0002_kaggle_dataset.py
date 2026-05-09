"""Add kaggle_dataset to pipelines and report to runs."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260422_0002"
down_revision = "20260509_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pipelines", sa.Column("kaggle_dataset", sa.String(length=200), nullable=True))
    op.add_column("runs", sa.Column("report", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("runs", "report")
    op.drop_column("pipelines", "kaggle_dataset")
