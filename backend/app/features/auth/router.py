from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.exceptions import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.features.auth.models import User
from app.features.auth.schemas import TokenRead, UserLogin, UserRead, UserRegister
from app.features.auth.service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["Auth"])


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

    return TokenRead(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user
