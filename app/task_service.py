class TaskNotFoundError(Exception):
    pass


def find_task(tasks: list[dict], task_id: int) -> dict:
    for task in tasks:
        if task["id"] == task_id:
            return task

    raise TaskNotFoundError("Task not found")