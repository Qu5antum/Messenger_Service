from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID


class ChatCreate(BaseModel):
	title: Optional[str] = None
	avatar: Optional[str] = None
	description: Optional[str] = None
	is_group: bool = False


class ChatResponse(BaseModel):
	id: UUID
	title: str
	avatar: str
	description: str

	model_config = ConfigDict(from_attributes=True)