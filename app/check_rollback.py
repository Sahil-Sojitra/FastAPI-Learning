from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Task
from app.task_service import _commit, create_task


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

        task = create_task(db, title="Task after rollback")
        print("Saved:", task.title, task.status)

        rows = list(db.scalars(select(Task)))
        assert len(rows) == 1
        print("Rows in test database:", len(rows))

    test_engine.dispose()


if __name__ == "__main__":
    main()