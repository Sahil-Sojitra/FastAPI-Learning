from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Task


class TaskNotFoundError(Exception):
    pass


def find_task(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise TaskNotFoundError("Task not found")
    return task


def get_tasks(db: Session, status: str | None = None) -> list[Task]:
    stmt = select(Task)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    return list(db.scalars(stmt).all())


def create_task(db: Session, title: str) -> Task:
    task = Task(title=title, status="TODO")
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task_status(db: Session, task: Task, status: str) -> Task:
    task.status = status
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
