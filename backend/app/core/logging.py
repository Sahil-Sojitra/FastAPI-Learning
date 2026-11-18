import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("app")


class JsonFormatter(logging.Formatter):
    """Custom logging formatter that outputs records as JSON strings."""

    def format(self, record: logging.LogRecord) -> str:
        if isinstance(record.msg, dict):
            data = dict(record.msg)
        else:
            data = {"message": record.getMessage()}

        if "timestamp" not in data:
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
        if "level" not in data:
            data["level"] = record.levelname

        return json.dumps(data, default=str)


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configures application-level JSON logging idempotently without duplicate handlers."""
    app_logger = logging.getLogger("app")
    app_logger.setLevel(level)

    for handler in app_logger.handlers:
        if isinstance(handler, logging.StreamHandler) and isinstance(handler.formatter, JsonFormatter):
            return app_logger

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    app_logger.addHandler(handler)
    app_logger.propagate = False

    return app_logger
