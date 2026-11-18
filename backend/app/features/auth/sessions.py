from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import UUID, uuid4

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.features.auth.models import RefreshSession


@dataclass(frozen=True)
class SessionGrant:
    session_id: UUID
    user_id: int
    expires_at: datetime
    refresh_token: str = field(repr=False)


def utc_now() -> datetime:
    # Keep UTC timestamps portable between PostgreSQL and SQLite.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def start_session(db: Session, user_id: int) -> SessionGrant:
    now = utc_now()
    grant = SessionGrant(
        session_id=uuid4(),
        user_id=user_id,
        expires_at=now + timedelta(days=settings.REFRESH_SESSION_EXPIRE_DAYS),
        refresh_token=token_urlsafe(48),
    )
    db.execute(
        delete(RefreshSession).where(
            RefreshSession.user_id == user_id,
            RefreshSession.expires_at <= now,
        )
    )
    db.add(
        RefreshSession(
            id=str(grant.session_id),
            user_id=user_id,
            expires_at=grant.expires_at,
            token_hash=_hash(grant.refresh_token),
        )
    )
    db.commit()
    return grant


def rotate_session(
    db: Session, session_id: UUID, previous_token: str
) -> SessionGrant | None:
    replacement = token_urlsafe(48)
    # One atomic update means concurrent requests cannot redeem the same token.
    result = db.execute(
        update(RefreshSession)
        .where(
            RefreshSession.id == str(session_id),
            RefreshSession.token_hash == _hash(previous_token),
            RefreshSession.expires_at > utc_now(),
        )
        .values(token_hash=_hash(replacement))
        .returning(RefreshSession.user_id, RefreshSession.expires_at)
    ).one_or_none()
    db.commit()

    if result is None:
        return None
    return SessionGrant(session_id, result.user_id, result.expires_at, replacement)


def revoke_session(db: Session, session_id: UUID, refresh_token: str) -> None:
    db.execute(
        delete(RefreshSession).where(
            RefreshSession.id == str(session_id),
            RefreshSession.token_hash == _hash(refresh_token),
        )
    )
    db.commit()
