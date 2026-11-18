import asyncio
from unittest.mock import AsyncMock, MagicMock
import httpx
import pytest
from pydantic import SecretStr

try:
    import httpx2
except ImportError:
    httpx2 = None

from google.genai import errors, types

from app.core.config import settings
from app.features.ai.dependencies import get_ai_service
from app.features.ai.exceptions import (
    AIGenerationTimeoutError,
    AIInvalidOutputError,
    AIServiceNotConfiguredError,
    AIServiceUnavailableError,
)
from app.features.ai.provider import GeminiProvider
from app.features.ai.schemas import TaskBreakdownRequest, TaskBreakdownResponse
from app.features.ai.service import AIService
from app.main import app, lifespan


def test_exception_tuples_contain_only_valid_exception_classes():
    from app.features.ai.provider import TIMEOUT_EXCEPTIONS, TRANSPORT_EXCEPTIONS

    for exc_cls in TIMEOUT_EXCEPTIONS:
        assert isinstance(exc_cls, type), f"{exc_cls} must be a type"
        assert issubclass(exc_cls, BaseException), f"{exc_cls} must inherit from BaseException"

    for exc_cls in TRANSPORT_EXCEPTIONS:
        assert isinstance(exc_cls, type), f"{exc_cls} must be a type"
        assert issubclass(exc_cls, BaseException), f"{exc_cls} must inherit from BaseException"


@pytest.fixture
def mock_ai_service():
    mock_service = MagicMock(spec=AIService)
    mock_service.break_down_task = AsyncMock()
    return mock_service


def test_successful_task_breakdown(authenticated_client, mock_ai_service):
    expected_response = TaskBreakdownResponse(
        suggestions=[
            "Design the database schema for password reset tokens.",
            "Create the forgot-password email request endpoint.",
            "Implement token verification and password update logic.",
        ]
    )
    mock_ai_service.break_down_task.return_value = expected_response
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["suggestions"] == expected_response.suggestions
        mock_ai_service.break_down_task.assert_awaited_once_with(
            "Add a forgot-password feature"
        )
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_authentication_required_no_provider_call(client, mock_ai_service):
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 401
        mock_ai_service.break_down_task.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


@pytest.mark.parametrize(
    "invalid_description",
    [
        "",  # Empty
        "   ",  # Whitespace only
        "ab",  # Too short (< 3 chars)
        "   ab   ",  # Too short after trim (< 3 chars)
        "x" * 2001,  # Too long (> 2000 chars)
    ],
)
def test_invalid_input_rejected_without_provider_call(
    authenticated_client, mock_ai_service, invalid_description
):
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": invalid_description},
        )
        assert response.status_code == 422
        mock_ai_service.break_down_task.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_missing_configuration_returns_503(authenticated_client, mock_ai_service):
    mock_ai_service.break_down_task.side_effect = AIServiceNotConfiguredError(
        "AI service is not configured"
    )
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 503
        assert response.json()["detail"] == "AI service is not configured"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_generation_timeout_returns_504(authenticated_client, mock_ai_service):
    mock_ai_service.break_down_task.side_effect = AIGenerationTimeoutError(
        "AI generation timed out"
    )
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 504
        assert response.json()["detail"] == "AI generation timed out"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_provider_unavailable_returns_503(authenticated_client, mock_ai_service):
    mock_ai_service.break_down_task.side_effect = AIServiceUnavailableError(
        "AI service is temporarily unavailable"
    )
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 503
        assert response.json()["detail"] == "AI service is temporarily unavailable"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_invalid_output_returns_502(authenticated_client, mock_ai_service):
    mock_ai_service.break_down_task.side_effect = AIInvalidOutputError(
        "AI service returned invalid or unusable response"
    )
    app.dependency_overrides[get_ai_service] = lambda: mock_ai_service

    try:
        response = authenticated_client.post(
            "/ai/task-breakdown",
            json={"description": "Add a forgot-password feature"},
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "AI service returned invalid or unusable response"
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


@pytest.mark.anyio
async def test_gemini_provider_unconfigured():
    provider = GeminiProvider(client=None, model="test-model")
    with pytest.raises(AIServiceNotConfiguredError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_handles_timeout():
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=asyncio.TimeoutError()
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIGenerationTimeoutError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_preserves_cancellation():
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=asyncio.CancelledError()
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(asyncio.CancelledError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_rejects_max_tokens_even_with_valid_json():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.prompt_feedback = None
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = types.FinishReason.MAX_TOKENS
    mock_response.candidates = [mock_candidate]
    mock_response.text = '{"suggestions": ["Step one", "Step two", "Step three"]}'
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_rejects_safety_blocked_response():
    mock_client = MagicMock()

    # Case A: Candidate finish_reason is SAFETY
    mock_response_safety_candidate = MagicMock()
    mock_response_safety_candidate.prompt_feedback = None
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = types.FinishReason.SAFETY
    mock_response_safety_candidate.candidates = [mock_candidate]
    mock_response_safety_candidate.text = ""
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_safety_candidate
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")

    # Case B: Prompt blocked by prompt_feedback
    mock_response_prompt_blocked = MagicMock()
    mock_feedback = MagicMock()
    mock_feedback.block_reason = types.BlockedReason.SAFETY
    mock_response_prompt_blocked.prompt_feedback = mock_feedback
    mock_response_prompt_blocked.candidates = []
    mock_response_prompt_blocked.text = None
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_prompt_blocked
    )

    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_rejects_missing_candidates():
    mock_client = MagicMock()

    # Empty candidates list
    mock_response_empty_candidates = MagicMock()
    mock_response_empty_candidates.prompt_feedback = None
    mock_response_empty_candidates.candidates = []
    mock_response_empty_candidates.text = None
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_empty_candidates
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")

    # None candidates attribute
    mock_response_none_candidates = MagicMock()
    mock_response_none_candidates.prompt_feedback = None
    mock_response_none_candidates.candidates = None
    mock_response_none_candidates.text = None
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_none_candidates
    )

    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_maps_sdk_quota_error_429():
    mock_client = MagicMock()
    quota_error = errors.APIError(
        429,
        {"error": {"code": 429, "message": "Resource has been exhausted", "status": "RESOURCE_EXHAUSTED"}},
    )
    mock_client.aio.models.generate_content = AsyncMock(side_effect=quota_error)

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIServiceUnavailableError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_handles_transport_timeout_and_disconnects():
    mock_client = MagicMock()
    provider = GeminiProvider(client=mock_client, model="test-model")

    # 1. Transport timeout maps to AIGenerationTimeoutError
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=httpx.ReadTimeout("Read timed out")
    )
    with pytest.raises(AIGenerationTimeoutError):
        await provider.generate_task_breakdown("Valid task description")

    # 2. Transport connect failure maps to AIServiceUnavailableError
    mock_client.aio.models.generate_content = AsyncMock(
        side_effect=httpx.ConnectError("Connection refused")
    )
    with pytest.raises(AIServiceUnavailableError):
        await provider.generate_task_breakdown("Valid task description")

    # 3. Transport remote disconnect maps to AIServiceUnavailableError
    if httpx2 is not None:
        mock_client.aio.models.generate_content = AsyncMock(
            side_effect=httpx2.RemoteProtocolError("Server disconnected without sending a response.")
        )
        with pytest.raises(AIServiceUnavailableError):
            await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_handles_empty_or_malformed_output():
    mock_client = MagicMock()

    # Empty text
    mock_response_empty = MagicMock()
    mock_response_empty.prompt_feedback = None
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = types.FinishReason.STOP
    mock_response_empty.candidates = [mock_candidate]
    mock_response_empty.text = ""
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_empty
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")

    # Malformed JSON
    mock_response_malformed = MagicMock()
    mock_response_malformed.prompt_feedback = None
    mock_response_malformed.candidates = [mock_candidate]
    mock_response_malformed.text = "{not valid json}"
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_malformed
    )
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")

    # Invalid schema (too few suggestions)
    mock_response_too_few = MagicMock()
    mock_response_too_few.prompt_feedback = None
    mock_response_too_few.candidates = [mock_candidate]
    mock_response_too_few.text = '{"suggestions": ["one", "two"]}'
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response_too_few
    )
    with pytest.raises(AIInvalidOutputError):
        await provider.generate_task_breakdown("Valid task description")


@pytest.mark.anyio
async def test_gemini_provider_success():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.prompt_feedback = None
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = types.FinishReason.STOP
    mock_response.candidates = [mock_candidate]
    mock_response.text = (
        '{"suggestions": ["Step one", "Step two", "Step three"]}'
    )
    mock_client.aio.models.generate_content = AsyncMock(
        return_value=mock_response
    )

    provider = GeminiProvider(client=mock_client, model="test-model")
    result = await provider.generate_task_breakdown("Valid task description")
    assert len(result.suggestions) == 3
    assert result.suggestions == ["Step one", "Step two", "Step three"]


@pytest.mark.anyio
async def test_lifespan_manages_and_cleans_up_client(monkeypatch):
    test_app = MagicMock()
    test_app.state = MagicMock()

    # Case 1: GEMINI_API_KEY is configured
    monkeypatch.setattr(
        settings,
        "GEMINI_API_KEY",
        SecretStr("test-key-long-enough-for-testing-12345"),
    )

    # Use lifespan context manager
    async with lifespan(test_app):
        assert test_app.state.gemini_client is not None
        client = test_app.state.gemini_client
        mock_aclose = AsyncMock()
        mock_close = MagicMock()
        monkeypatch.setattr(client.aio, "aclose", mock_aclose)
        monkeypatch.setattr(client, "close", mock_close)

    # Verify shutdown was called
    mock_aclose.assert_awaited_once()
    mock_close.assert_called_once()

    # Case 2: GEMINI_API_KEY is None
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    async with lifespan(test_app):
        assert test_app.state.gemini_client is None
