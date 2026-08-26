from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

from .user_schema import UserOut


class ChatCreate(BaseModel):
	title: Optional[str] = None
	description: Optional[str] = None


class ChatResponse(BaseModel):
	id: UUID
	is_group: bool
	title: Optional[str] = None
	chat_avatar_url: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None
	created_at: datetime
	updated_at: datetime

	model_config = ConfigDict(from_attributes=True)


class ChatUpdate(BaseModel):
	title: Optional[str] = None
	chat_avatar_url: Optional[str] = None
	description: Optional[str] = None
	owner_id: Optional[UUID] = None


class ChatParticipantResponse(BaseModel):
	id: UUID
	chat_id: UUID
	user_id: UUID
	joined_at: datetime
	user: UserOut

	model_config = ConfigDict(from_attributes=True)