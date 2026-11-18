from time import perf_counter
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
import app.db.model_registry  # Ensures all models are registered with Base.metadata
from app.features.auth.router import router as auth_router
from app.features.health.router import router as health_router
from app.features.tasks.router import router as tasks_router

app = FastAPI(title="Task Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    started = perf_counter()

    response = await call_next(request)

    elapsed_ms = (perf_counter() - started) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"

    return response


app.include_router(tasks_router)
app.include_router(auth_router)
app.include_router(health_router)
