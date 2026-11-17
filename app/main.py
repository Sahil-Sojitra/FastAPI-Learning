from time import perf_counter
from fastapi import Depends, FastAPI, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
import app.models  # Registers Task model with Base
from app.task_routes import router as tasks_router


app = FastAPI(title="Task Board API")


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    started = perf_counter()

    response = await call_next(request)

    elapsed_ms = (perf_counter() - started) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"

    return response


app.include_router(tasks_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "task-board",
    }


@app.get("/health/db")
def database_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"database": "ok"}
