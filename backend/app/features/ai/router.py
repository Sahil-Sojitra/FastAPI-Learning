import asyncio
from fastapi import APIRouter, Depends, HTTPException, status

from app.features.ai.dependencies import get_ai_service
from app.features.ai.exceptions import (
    AIGenerationTimeoutError,
    AIInvalidOutputError,
    AIServiceNotConfiguredError,
    AIServiceUnavailableError,
)
from app.features.ai.schemas import TaskBreakdownRequest, TaskBreakdownResponse
from app.features.ai.service import AIService
from app.features.auth.dependencies import get_current_user
from app.features.auth.models import User

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/task-breakdown",
    response_model=TaskBreakdownResponse,
    status_code=status.HTTP_200_OK,
)
async def task_breakdown(
    payload: TaskBreakdownRequest,
    current_user: User = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
) -> TaskBreakdownResponse:
    try:
        return await ai_service.break_down_task(payload.description)
    except AIServiceNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except AIGenerationTimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc
    except AIServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except AIInvalidOutputError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except asyncio.CancelledError:
        raise
