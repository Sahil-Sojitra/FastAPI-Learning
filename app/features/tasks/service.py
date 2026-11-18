from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.tasks.exceptions import TaskNotFoundError
from app.features.tasks.models import Task


def _commit(db: Session) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise


def get_tasks(
    db: Session,
    owner_id: int,
    status: str | None = None,
    limit: int = 10,
    offset: int = 0,
) -> list[Task]:
    stmt = (
        select(Task)
        .where(Task.owner_id == owner_id)
        .order_by(Task.id)
    )

    if status is not None:
        stmt = stmt.where(Task.status == status)

    stmt = stmt.offset(offset).limit(limit)
    return list(db.scalars(stmt))


def find_task(
    db: Session,
    task_id: int,
    owner_id: int,
) -> Task:
    task = db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.owner_id == owner_id,
        )
    )

    if task is None:
        raise TaskNotFoundError("Task not found")

    return task


def create_task(
    db: Session,
    title: str,
    owner_id: int,
) -> Task:
    task = Task(
        title=title,
        status="TODO",
        owner_id=owner_id,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    db.add(task)
    _commit(db)
    db.refresh(task)
    return task


def update_task_status(db: Session, task: Task, status: str) -> Task:
    task.status = status
    _commit(db)
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    _commit(db)
