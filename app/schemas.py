from typing import Literal
from pydantic import BaseModel, Field,ConfigDict
from datetime import datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=100)


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    status: str
    created_at : datetime|None 


class TaskStatusUpdate(BaseModel):
    status: Literal["TODO", "IN_PROGRESS", "DONE"]