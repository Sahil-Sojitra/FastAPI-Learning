class AIServiceError(Exception):
    """Base exception for all AI domain operations."""


class AIServiceNotConfiguredError(AIServiceError):
    """Raised when the AI provider or API key is not configured."""


class AIGenerationTimeoutError(AIServiceError):
    """Raised when AI response generation exceeds the allowed deadline."""


class AIServiceUnavailableError(AIServiceError):
    """Raised when the provider is down, experiencing rate limits, or network errors."""


class AIInvalidOutputError(AIServiceError):
    """Raised when model response is empty, malformed, blocked, or fails schema validation."""
