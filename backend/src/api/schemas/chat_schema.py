import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

from .user_schema import UserOut


class ChatCreate(BaseModel):
	title: Optional[str] = None
	avatar: Optional[str] = None
	description: Optional[str] = None
	is_group: bool = False


class ChatResponse(BaseModel):
	id: UUID
	is_group: bool
	title: Optional[str] = None
	avatar: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None

	model_config = ConfigDict(from_attributes=True)


class ChatUpdate(BaseModel):
	title: Optional[str] = None
	avatar: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None


class ChatParticipantResponse(BaseModel):
	id: UUID
	chat_id: UUID
	user_id: UUID
	joined_at: datetime.datetime
	user: UserOut

	model_config = ConfigDict(from_attributes=True)