import json
from pathlib import Path
from typing import Any, Literal
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
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
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    CORS_ORIGINS: list[str] = Field(default_factory=list)

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
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                return []
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v


settings = Settings()

# Backward-compatible exports for existing consumers
JWT_SECRET = settings.JWT_SECRET.get_secret_value()
JWT_ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL = settings.DATABASE_URL
DB_PATH = DEFAULT_DB_PATH
