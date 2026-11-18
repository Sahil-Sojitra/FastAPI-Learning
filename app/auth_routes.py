from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth_dependencies import get_current_user
from app.models import User
from app.schemas import UserRead

from app.auth_service import (
    EmailAlreadyRegisteredError,
    register_user,
)
from app.database import get_db
from app.schemas import UserCreate, UserRead

from app.auth_service import (
    InvalidCredentialsError,
    authenticate_user,
)
from app.schemas import TokenRead, UserLogin
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201, response_model=UserRead)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return register_user(
            db,
            email=str(payload.email),
            password=payload.password,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/login", response_model=TokenRead)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    try:
        user = authenticate_user(
            db,
            email=str(payload.email),
            password=payload.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return TokenRead(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user