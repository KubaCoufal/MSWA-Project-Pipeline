from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import UserRole
from app.models import User


DEMO_USERS = [
    User(id=1, email="admin@pipeline.local", display_name="Admin", role=UserRole.ADMIN),
    User(id=2, email="operator@pipeline.local", display_name="Operator", role=UserRole.OPERATOR),
    User(id=3, email="viewer@pipeline.local", display_name="Viewer", role=UserRole.VIEWER),
]


def seed_demo_users(session: Session) -> None:
    existing = session.scalar(select(User.id).limit(1))
    if existing is not None:
        return

    for user in DEMO_USERS:
        session.add(
            User(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                role=user.role,
            )
        )
    session.commit()
