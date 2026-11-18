"""Explicitly registers all models with Base.metadata.

Import this module whenever Alembic or test suites need complete
knowledge of all database models.
"""
from app.db.base import Base
from app.features.auth.models import RefreshSession, User
from app.features.tasks.models import Task

__all__ = ["Base", "User", "RefreshSession", "Task"]
