import os
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.settings import DEFAULT_DATABASE_URL, DEFAULT_DB_PATH, PROJECT_ROOT, Settings

VALID_SECRET = "x" * 32


def test_valid_configuration_and_defaults(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    s = Settings(JWT_SECRET=VALID_SECRET, _env_file=None)

    assert s.APP_ENV == "development"
    assert s.JWT_SECRET.get_secret_value() == VALID_SECRET
    assert s.JWT_ALGORITHM == "HS256"
    assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 15
    assert s.DATABASE_URL == DEFAULT_DATABASE_URL
    assert s.CORS_ORIGINS == []


def test_missing_jwt_secret_rejection(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError) as exc_info:
        Settings(_env_file=None)

    errors = exc_info.value.errors()
    assert any(err["loc"] == ("JWT_SECRET",) and err["type"] == "missing" for err in errors)


def test_short_jwt_secret_rejection(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    short_secret = "too-short-secret"

    with pytest.raises(ValidationError) as exc_info:
        Settings(JWT_SECRET=short_secret, _env_file=None)

    err_str = str(exc_info.value)
    assert "at least 32 UTF-8 bytes" in err_str
    # Verify the secret value is masked and never printed in error output
    assert short_secret not in err_str


def test_invalid_token_expiry_rejection(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError):
        Settings(JWT_SECRET=VALID_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES=0, _env_file=None)

    with pytest.raises(ValidationError):
        Settings(JWT_SECRET=VALID_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES=1441, _env_file=None)

    valid_low = Settings(JWT_SECRET=VALID_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES=1, _env_file=None)
    assert valid_low.ACCESS_TOKEN_EXPIRE_MINUTES == 1

    valid_high = Settings(JWT_SECRET=VALID_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES=1440, _env_file=None)
    assert valid_high.ACCESS_TOKEN_EXPIRE_MINUTES == 1440


def test_environment_variables_override_dotenv(tmp_path, monkeypatch):
    temp_env = tmp_path / ".env.test"
    temp_env.write_text(
        "APP_ENV=test\n"
        "ACCESS_TOKEN_EXPIRE_MINUTES=30\n"
        f"JWT_SECRET={VALID_SECRET}\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)

    s = Settings(_env_file=temp_env)

    # ACCESS_TOKEN_EXPIRE_MINUTES was overridden by OS environment variable
    assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 60
    # APP_ENV was loaded from dotenv
    assert s.APP_ENV == "test"
    assert s.JWT_SECRET.get_secret_value() == VALID_SECRET


def test_default_database_location(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)

    s = Settings(JWT_SECRET=VALID_SECRET, _env_file=None)

    expected_path = (PROJECT_ROOT / "task_board.db").resolve()
    assert s.DATABASE_URL == f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    assert DEFAULT_DB_PATH.resolve() == expected_path


def test_cors_origins_parsing(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    # Empty string
    s1 = Settings(JWT_SECRET=VALID_SECRET, CORS_ORIGINS="", _env_file=None)
    assert s1.CORS_ORIGINS == []

    # Comma-separated string
    s2 = Settings(
        JWT_SECRET=VALID_SECRET,
        CORS_ORIGINS="http://localhost:3000, https://myapp.example.com",
        _env_file=None,
    )
    assert s2.CORS_ORIGINS == ["http://localhost:3000", "https://myapp.example.com"]

    # JSON list string
    s3 = Settings(
        JWT_SECRET=VALID_SECRET,
        CORS_ORIGINS='["http://localhost:3000", "https://myapp.example.com"]',
        _env_file=None,
    )
    assert s3.CORS_ORIGINS == ["http://localhost:3000", "https://myapp.example.com"]

    # Python list
    s4 = Settings(
        JWT_SECRET=VALID_SECRET,
        CORS_ORIGINS=["http://localhost:3000"],
        _env_file=None,
    )
    assert s4.CORS_ORIGINS == ["http://localhost:3000"]


def test_restricted_env_and_algorithm(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError):
        Settings(JWT_SECRET=VALID_SECRET, APP_ENV="staging", _env_file=None)

    with pytest.raises(ValidationError):
        Settings(JWT_SECRET=VALID_SECRET, JWT_ALGORITHM="RS256", _env_file=None)


def test_cors_middleware_registered_on_app():
    from app.main import app
    from fastapi.middleware.cors import CORSMiddleware

    # Verify CORSMiddleware is present in the middleware stack
    cors_middlewares = [
        m for m in app.user_middleware if m.cls == CORSMiddleware
    ]
    assert len(cors_middlewares) == 1
    kwargs = cors_middlewares[0].kwargs
    assert kwargs["allow_credentials"] is False
    assert set(kwargs["allow_methods"]) == {"GET", "POST", "PATCH", "DELETE", "OPTIONS"}
    assert set(kwargs["allow_headers"]) == {"Authorization", "Content-Type"}

