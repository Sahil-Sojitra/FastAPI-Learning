from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exception_handlers import unhandled_exception_handler
from app.core.logging import setup_logging
from app.core.middleware import RequestLoggingMiddleware
import app.db.model_registry  # Ensures all models are registered with Base.metadata
from app.features.auth.router import router as auth_router
from app.features.health.router import router as health_router
from app.features.tasks.router import router as tasks_router

setup_logging()

app = FastAPI(title="Task Board API", debug=False)

app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(tasks_router)
app.include_router(auth_router)
app.include_router(health_router)
