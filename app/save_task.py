from sqlalchemy.orm import Session
from app.database import engine
from app.models import Task
from app.task_service import create_task


def main():
    with Session(engine) as db:
        task = create_task(db, title="My first persistent task")
        saved_id = task.id
        print("Saved task ID:", saved_id)

    with Session(engine) as db:
        saved_task = db.get(Task, saved_id)

        if saved_task is None:
            raise RuntimeError("Saved task could not be read")

        print("Read back:", saved_task.title, saved_task.status)


if __name__ == "__main__":
    main()