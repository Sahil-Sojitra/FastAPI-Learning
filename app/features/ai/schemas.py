from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskBreakdownRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("description must be a string")
        v = v.strip()
        if len(v) < 3:
            raise ValueError("description must contain at least 3 characters after trimming")
        if len(v) > 2000:
            raise ValueError("description must contain at most 2000 characters after trimming")
        return v


class TaskBreakdownResponse(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    suggestions: list[str] = Field(min_length=3, max_length=7)

    @field_validator("suggestions", mode="before")
    @classmethod
    def validate_suggestions(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            raise ValueError("suggestions must be a list of strings")
        cleaned: list[str] = []
        for item in v:
            if not isinstance(item, str):
                raise ValueError("each suggestion must be a string")
            item = item.strip()
            if not item:
                raise ValueError("each suggestion must be non-empty after trimming")
            if len(item) > 200:
                raise ValueError("each suggestion must contain at most 200 characters")
            cleaned.append(item)

        if len(cleaned) < 3 or len(cleaned) > 7:
            raise ValueError("suggestions must contain between 3 and 7 items")
        return cleaned
