from pydantic import BaseModel, EmailStr, field_validator, SecretStr, model_validator, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Self
import re

from src.database.models import UserRole

class DummyLoginRequest(BaseModel):
    role: UserRole


class UserBase(BaseModel):
    username: str
    phone_number: str

class UserCreate(UserBase):
    password: SecretStr
    confirm_password: SecretStr
    role: UserRole


class UserOut(UserBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

