"""HISTORICAL LEARNING SCRIPT:
This script was originally used in early learning stages to create database tables
directly via SQLAlchemy Base metadata.

NOTE: Application schema initialization and migrations are now managed exclusively
via Alembic (e.g. alembic upgrade head). This file is preserved for reference only.

Usage:
    python scripts/learning/init_db.py
"""
import sys
from pathlib import Path

# Add project root to sys.path so 'app' package is found
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect
from app.db.model_registry import Base
from app.db.session import engine


def main():
    Base.metadata.create_all(engine)
    print("Tasks table exists:", inspect(engine).has_table("tasks"))


if __name__ == "__main__":
    main()
