"""Add EDA result storage to runs."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260509_0002"
down_revision = "20260411_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("eda_result", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("runs", "eda_result")
