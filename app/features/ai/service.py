from app.features.ai.provider import AIProviderProtocol
from app.features.ai.schemas import TaskBreakdownResponse


class AIService:
    def __init__(self, provider: AIProviderProtocol) -> None:
        self.provider = provider

    async def break_down_task(self, description: str) -> TaskBreakdownResponse:
        return await self.provider.generate_task_breakdown(description)
