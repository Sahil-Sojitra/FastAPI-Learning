from fastapi import APIRouter, Depends, HTTPException, Response
from app.task_service import TaskNotFoundError, find_task
from app.schemas import TaskCreate, TaskRead, TaskStatusUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])

tasks = [
    {"id": 1, "title": "Learn FastAPI routing", "status": "TODO"},
    {"id": 2, "title": "Build the task API", "status": "IN_PROGRESS"},
]



def get_existing_task(task_id: int) -> dict:
    try:
        return find_task(tasks, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc



@router.get("", response_model=list[TaskRead])
def get_tasks(status: str | None = None):
    if status is None:
        return tasks

    filtered_tasks = []
    for task in tasks:
        if task["status"] == status:
            filtered_tasks.append(task)

    return filtered_tasks


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: dict = Depends(get_existing_task)):
    return task


@router.post("", status_code=201, response_model=TaskRead)
def create_task(task: TaskCreate):
    new_id = max((item["id"] for item in tasks), default=0) + 1

    new_task = {
        "id": new_id,
        "title": task.title,
        "status": "TODO",
    }

    tasks.append(new_task)
    return new_task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task_status(
    update: TaskStatusUpdate,
    task: dict = Depends(get_existing_task),
):
    task["status"] = update.status
    return task


@router.delete("/{task_id}", status_code=204, response_class=Response)
def delete_task(task_id: int):
    for index, task in enumerate(tasks):
        if task["id"] == task_id:
            del tasks[index]
            return Response(status_code=204)

    raise HTTPException(status_code=404, detail="Task not found")
