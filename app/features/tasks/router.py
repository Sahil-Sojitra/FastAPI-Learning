from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User
from app.features.tasks import service as task_service
from app.features.tasks.exceptions import TaskNotFoundError
from app.features.tasks.models import Task
from app.features.tasks.schemas import TaskCreate, TaskRead, TaskStatusUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def get_existing_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    try:
        return task_service.find_task(
            db,
            task_id=task_id,
            owner_id=user.id,
        )
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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_tasks(
        db,
        owner_id=user.id,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: Task = Depends(get_existing_task)):
    return task


@router.post("", status_code=201, response_model=TaskRead)
def create_task(
    payload: TaskCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.create_task(
        db,
        title=payload.title,
        owner_id=user.id,
    )


@router.patch("/{task_id}", response_model=TaskRead)
def update_task_status(
    update: TaskStatusUpdate,
    task: Task = Depends(get_existing_task),
    db: Session = Depends(get_db),
):
    return task_service.update_task_status(db, task, update.status)


@router.delete(
    "/{task_id}",
    status_code=204,
    response_class=Response,
)
def delete_task(
    task: Task = Depends(get_existing_task),
    db: Session = Depends(get_db),
):
    task_service.delete_task(db, task)
    return Response(status_code=204)
