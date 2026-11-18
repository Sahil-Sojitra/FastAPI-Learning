from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.exceptions import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.features.auth.models import User
from app.features.auth.schemas import SessionRequest, TokenRead, UserLogin, UserRead, UserRegister
from app.features.auth.service import authenticate_user, register_user
from app.features.auth.sessions import (
    SessionGrant,
    revoke_session,
    rotate_session,
    start_session,
    utc_now,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _refresh_cookie(session_id: UUID) -> str:
    # Cookies are shared across tabs. Distinct names keep their sessions separate.
    return f"taskboard_refresh_{session_id}"


def _issue_tokens(response: Response, grant: SessionGrant) -> TokenRead:
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        _refresh_cookie(grant.session_id),
        grant.refresh_token,
        max_age=max(0, ceil((grant.expires_at - utc_now()).total_seconds())),
        secure=settings.APP_ENV == "production",
        httponly=True,
        samesite="lax",
    )
    return TokenRead(
        access_token=create_access_token(grant.user_id),
        session_id=grant.session_id,
    )


@router.post("/register", status_code=201, response_model=UserRead)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    try:
        return register_user(
            db,
            email=payload.email,
            password=payload.password,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/login", response_model=TokenRead)
def login(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        user = authenticate_user(
            db,
            email=payload.email,
            password=payload.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return _issue_tokens(response, start_session(db, user.id))


@router.post(
    "/refresh",
    response_model=TokenRead,
    responses={401: {"description": "Missing, expired, or invalid refresh cookie"}},
)
def refresh(
    payload: SessionRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Redeem the session cookie for a fresh bearer token and rotate the cookie."""
    token = request.cookies.get(_refresh_cookie(payload.session_id))
    grant = rotate_session(db, payload.session_id, token) if token else None
    if grant is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh session",
            headers={"Cache-Control": "no-store"},
        )
    return _issue_tokens(response, grant)


@router.post("/logout", status_code=204, response_class=Response)
def logout(
    payload: SessionRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Revoke the current refresh session and remove its browser cookie."""
    name = _refresh_cookie(payload.session_id)
    if token := request.cookies.get(name):
        revoke_session(db, payload.session_id, token)
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    response.delete_cookie(
        name,
        secure=settings.APP_ENV == "production",
        httponly=True,
        samesite="lax",
    )
    return response


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user
