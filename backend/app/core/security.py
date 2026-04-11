from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.enums import UserRole
from app.models import User


def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    demo_user_id: Annotated[int | None, Header(alias="X-Demo-User-Id")] = None,
) -> User:
    user_id = demo_user_id or 1
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown demo user.")
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def dependency(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this action.")
        return current_user

    return dependency
