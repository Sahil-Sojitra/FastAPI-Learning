import json
from pathlib import Path
from typing import Annotated, Any, Literal
from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
DEFAULT_DB_PATH = PROJECT_ROOT / "task_board.db"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: Literal["development", "test", "production"] = "development"
    JWT_SECRET: SecretStr
    JWT_ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=1, le=1440)
    REFRESH_SESSION_EXPIRE_DAYS: int = Field(default=14, ge=1, le=90)
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    NEON_DB: str | None = None
    GEMINI_API_KEY: SecretStr | None = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(default_factory=list)

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return "postgresql+psycopg://" + v[len("postgresql://"):]
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v[len("postgres://"):]
        return v

    @model_validator(mode="after")
    def resolve_neon_db_fallback(self) -> "Settings":
        if self.DATABASE_URL == DEFAULT_DATABASE_URL and self.NEON_DB:
            url = self.NEON_DB
            if url.startswith("postgresql://"):
                url = "postgresql+psycopg://" + url[len("postgresql://"):]
            elif url.startswith("postgres://"):
                url = "postgresql+psycopg://" + url[len("postgres://"):]
            self.DATABASE_URL = url
        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        class MaskSecretSource:
            def __init__(self, source):
                self.source = source

            def __call__(self):
                data = self.source()
                if "JWT_SECRET" in data and isinstance(data["JWT_SECRET"], str):
                    data["JWT_SECRET"] = SecretStr(data["JWT_SECRET"])
                if "GEMINI_API_KEY" in data and isinstance(data["GEMINI_API_KEY"], str):
                    data["GEMINI_API_KEY"] = SecretStr(data["GEMINI_API_KEY"])
                return data

        return (
            MaskSecretSource(init_settings),
            MaskSecretSource(env_settings),
            MaskSecretSource(dotenv_settings),
            MaskSecretSource(file_secret_settings),
        )

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: SecretStr) -> SecretStr:
        raw_bytes = v.get_secret_value().encode("utf-8")
        if len(raw_bytes) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 UTF-8 bytes")
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v

        value = v.strip()
        if value.startswith("["):
            try:
                origins = json.loads(value)
            except json.JSONDecodeError as exc:
                raise ValueError("CORS_ORIGINS contains a malformed JSON array") from exc
            if not all(isinstance(origin, str) for origin in origins):
                raise ValueError("CORS_ORIGINS entries must be strings")
        else:
            origins = value.split(",")

        return [origin for origin in map(str.strip, origins) if origin]


settings = Settings()

# Convenient exports for configuration consumers
JWT_SECRET = settings.JWT_SECRET.get_secret_value()
JWT_ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL = settings.DATABASE_URL
GEMINI_MODEL = settings.GEMINI_MODEL
DB_PATH = DEFAULT_DB_PATH
