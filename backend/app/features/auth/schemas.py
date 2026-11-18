from pydantic import BaseModel, ConfigDict, EmailStr, Field, UUID4


class UserRegister(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr


class TokenRead(BaseModel):
    access_token: str
    session_id: UUID4
    token_type: str = "bearer"


class SessionRequest(BaseModel):
    session_id: UUID4
