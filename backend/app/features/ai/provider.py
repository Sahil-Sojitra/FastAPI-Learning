import asyncio
from typing import Protocol
import httpx

try:
    import httpx2
except ImportError:
    httpx2 = None

from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.core.logging import logger
from app.features.ai.exceptions import (
    AIGenerationTimeoutError,
    AIInvalidOutputError,
    AIServiceNotConfiguredError,
    AIServiceUnavailableError,
)
from app.features.ai.schemas import TaskBreakdownResponse

SYSTEM_INSTRUCTION = (
    "Break the supplied task into actionable steps and return the required schema.\n"
    "For a clear goal, give concrete steps in execution order. Review the existing "
    "behavior where relevant, then explain what to change and how to test it.\n"
    "If missing information would change the plan, ask to clarify that specific detail. "
    "For vague goals, gather evidence and prioritize findings before proposing fixes.\n"
    "Turn every explicit constraint into a direct check using the user's values. For "
    "example, if asked for recipes for four people in under 30 minutes, check that each "
    "recipe serves four and that its total prep and cooking time is under 30 minutes.\n"
    "Do not invent targets, defaults, or requirements."
)
GENERATION_TIMEOUT_SECONDS = 30.0

_timeout_exceptions: list[type[BaseException]] = [httpx.TimeoutException]
_transport_exceptions: list[type[BaseException]] = [httpx.TransportError]

if httpx2 is not None:
    timeout_cls = getattr(httpx2, "TimeoutException", None)
    if isinstance(timeout_cls, type) and issubclass(timeout_cls, BaseException):
        _timeout_exceptions.append(timeout_cls)
    transport_cls = getattr(httpx2, "TransportError", None)
    if isinstance(transport_cls, type) and issubclass(transport_cls, BaseException):
        _transport_exceptions.append(transport_cls)

TIMEOUT_EXCEPTIONS = tuple(_timeout_exceptions)
TRANSPORT_EXCEPTIONS = tuple(_transport_exceptions)


class AIProviderProtocol(Protocol):
    async def generate_task_breakdown(self, description: str) -> TaskBreakdownResponse:
        ...


class GeminiProvider:
    def __init__(self, client: genai.Client | None, model: str) -> None:
        self.client = client
        self.model = model

    async def generate_task_breakdown(self, description: str) -> TaskBreakdownResponse:
        if self.client is None:
            raise AIServiceNotConfiguredError("AI service is not configured")

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=TaskBreakdownResponse,
            temperature=0.2,
        )

        try:
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=self.model,
                    contents=description,
                    config=config,
                ),
                timeout=GENERATION_TIMEOUT_SECONDS,
            )
        except asyncio.CancelledError:
            raise
        except (TimeoutError, asyncio.TimeoutError, *TIMEOUT_EXCEPTIONS) as exc:
            logger.warning("AI task breakdown generation timed out.")
            raise AIGenerationTimeoutError("AI generation timed out") from exc
        except errors.APIError as exc:
            # Map provider API errors without logging prompts, keys, or raw payloads
            status_code = getattr(exc, "code", None)
            logger.warning(
                "Gemini API returned an error response (code: %s).",
                status_code if status_code is not None else "unknown",
            )
            raise AIServiceUnavailableError(
                "AI service is temporarily unavailable"
            ) from exc
        except TRANSPORT_EXCEPTIONS as exc:
            logger.warning("Transport or network failure during AI generation.")
            raise AIServiceUnavailableError(
                "AI service is temporarily unavailable"
            ) from exc
        except Exception as exc:
            logger.warning("Unexpected provider client error during AI generation.")
            raise AIServiceUnavailableError(
                "AI service is temporarily unavailable"
            ) from exc

        # Reject null response
        if response is None:
            logger.warning("Gemini returned null response.")
            raise AIInvalidOutputError(
                "AI service returned invalid or unusable response"
            )

        # Reject prompt-level blocking
        prompt_feedback = getattr(response, "prompt_feedback", None)
        if prompt_feedback is not None:
            block_reason = getattr(prompt_feedback, "block_reason", None)
            if block_reason is not None:
                logger.warning(
                    "Gemini generation blocked by prompt feedback (block_reason: %s).",
                    block_reason,
                )
                raise AIInvalidOutputError(
                    "AI service returned invalid or unusable response"
                )

        # Reject missing candidates
        candidates = getattr(response, "candidates", None)
        if not candidates:
            logger.warning("Gemini response contained no candidates.")
            raise AIInvalidOutputError(
                "AI service returned invalid or unusable response"
            )

        # Reject non-STOP completion reasons (e.g. MAX_TOKENS, SAFETY, RECITATION, etc.)
        primary_candidate = candidates[0]
        finish_reason = getattr(primary_candidate, "finish_reason", None)
        if finish_reason != types.FinishReason.STOP:
            logger.warning(
                "Gemini candidate finished with non-STOP reason: %s.",
                finish_reason,
            )
            raise AIInvalidOutputError(
                "AI service returned invalid or unusable response"
            )

        # Validate that the response contains non-empty text
        raw_text = getattr(response, "text", None)
        if not raw_text or not raw_text.strip():
            logger.warning("Gemini returned an empty or missing response payload.")
            raise AIInvalidOutputError(
                "AI service returned invalid or unusable response"
            )

        try:
            validated_response = TaskBreakdownResponse.model_validate_json(raw_text)
        except (ValueError, ValidationError) as exc:
            logger.warning("Failed to validate AI response against TaskBreakdownResponse schema.")
            raise AIInvalidOutputError(
                "AI service returned invalid or unusable response"
            ) from exc

        return validated_response
