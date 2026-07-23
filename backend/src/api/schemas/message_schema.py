from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional


class MessageRequest(BaseModel):
	text: str


class MessageResponse(BaseModel):
	id: UUID
	chat_id: UUID
	sender_id: UUID
	text: str

	model_config = ConfigDict(from_attributes=True)


class MessageUpdate(BaseModel):
	text: Optional[str] = None