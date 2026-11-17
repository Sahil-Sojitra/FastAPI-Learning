from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Literal
from app.database import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskRead, TaskStatusUpdate
from app.task_service import (
    TaskNotFoundError,
    create_task as service_create_task,
    delete_task as service_delete_task,
    find_task,
    get_tasks as service_get_tasks,
    update_task_status as service_update_task_status,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def get_existing_task(task_id: int, db: Session = Depends(get_db)) -> Task:
    try:
        return find_task(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@router.get("", response_model=list[TaskRead])
def get_tasks(
    status: Literal["TODO", "IN_PROGRESS", "DONE"] | None = None,
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return service_get_tasks(
        db,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: Task = Depends(get_existing_task)):
    return task


@router.post("", status_code=201, response_model=TaskRead)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    return service_create_task(db, title=task.title)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task_status(
    update: TaskStatusUpdate,
    task: Task = Depends(get_existing_task),
    db: Session = Depends(get_db),
):
    return service_update_task_status(db, task, update.status)


@router.delete("/{task_id}", status_code=204, response_class=Response)
def delete_task(
    task: Task = Depends(get_existing_task),
    db: Session = Depends(get_db),
):
    service_delete_task(db, task)
    return Response(status_code=204)
