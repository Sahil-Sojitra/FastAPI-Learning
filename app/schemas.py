from typing import Literal
from pydantic import BaseModel, Field, EmailStr ,ConfigDict
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


class UserCreate(BaseModel):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=12, max_length=128, repr=False)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=1, max_length=128, repr=False)


class TokenRead(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"