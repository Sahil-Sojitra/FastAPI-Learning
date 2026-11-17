from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password
from app.security import DUMMY_PASSWORD_HASH, verify_password

class InvalidCredentialsError(Exception):
    pass


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    user = find_user_by_email(db, email.lower())

    stored_hash = (
        user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    )
    password_matches = verify_password(password, stored_hash)

    if user is None or not password_matches:
        raise InvalidCredentialsError("Incorrect email or password")

    return user


class EmailAlreadyRegisteredError(Exception):
    pass


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, email: str, password: str) -> User:
    email = email.lower()

    if find_user_by_email(db, email) is not None:
        raise EmailAlreadyRegisteredError("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        if find_user_by_email(db, email) is not None:
            raise EmailAlreadyRegisteredError(
                "Email already registered"
            ) from exc

        raise
    except SQLAlchemyError:
        db.rollback()
        raise

    db.refresh(user)
    return user