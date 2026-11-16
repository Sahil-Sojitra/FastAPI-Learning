from fastapi import FastAPI,Request
from app.task_routes import router as tasks_router
from time import perf_counter
import asyncio
import time


app = FastAPI(title="Task Board API")


@app.get("/demo/blocking")
async def blocking_wait():
    time.sleep(3)
    return {"message": "Blocking wait finished"}


@app.get("/demo/nonblocking")
async def nonblocking_wait():
    await asyncio.sleep(3)
    return {"message": "Nonblocking wait finished"}


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


