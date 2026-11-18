from fastapi import Request
from app.core.config import settings
from app.features.ai.provider import GeminiProvider
from app.features.ai.service import AIService


def get_ai_service(request: Request) -> AIService:
    client = getattr(request.app.state, "gemini_client", None)
    provider = GeminiProvider(client=client, model=settings.GEMINI_MODEL)
    return AIService(provider=provider)
