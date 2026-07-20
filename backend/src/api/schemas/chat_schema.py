from pydantic import BaseModel
from typing import Optional


class ChatCreate(BaseModel):
	title: Optional[str] = None
	avatar: Optional[str] = None
	description: Optional[str] = None
	is_group: bool = False