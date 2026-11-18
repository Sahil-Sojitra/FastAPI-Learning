"""Learning script demonstrating direct SQLAlchemy session creation and task persistence.

Usage:
    python scripts/learning/save_task.py
"""
import sys
from pathlib import Path

# Add project root to sys.path so 'app' package is found
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy.orm import Session
from app.db.session import engine
from app.features.tasks.models import Task
from app.features.tasks.service import create_task


def main():
    with Session(engine) as db:
        task = create_task(db, title="My first persistent task", owner_id=1)
        saved_id = task.id
        print("Saved task ID:", saved_id)

    with Session(engine) as db:
        saved_task = db.get(Task, saved_id)

        if saved_task is None:
            raise RuntimeError("Saved task could not be read")

        print("Read back:", saved_task.title, saved_task.status)


if __name__ == "__main__":
    main()
