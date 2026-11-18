"""Learning script demonstrating transactional rollback on database integrity errors.

Usage:
    python scripts/learning/check_rollback.py
"""
import sys
from pathlib import Path

# Add project root to sys.path so 'app' package is found
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.model_registry import Base
from app.features.tasks.models import Task
from app.features.tasks.service import _commit, create_task


def main():
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(test_engine)

    with Session(test_engine) as db:
        # Missing the required title.
        db.add(Task(status="TODO"))

        try:
            _commit(db)
        except IntegrityError:
            print("Invalid task rejected; rollback completed.")
        else:
            raise AssertionError("Expected missing title to fail")

        task = create_task(db, title="Task after rollback", owner_id=1)
        print("Saved:", task.title, task.status)

        rows = list(db.scalars(select(Task)))
        assert len(rows) == 1
        print("Rows in test database:", len(rows))

    test_engine.dispose()


if __name__ == "__main__":
    main()
