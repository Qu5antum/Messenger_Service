
from uuid import UUID
from sqlalchemy import select

from .base_repository import BaseRepository
from src.database.models import Chat


class ChatRepository(BaseRepository):
	model = Chat

	async def get_chat_by_owner_id(self, owner_id: UUID):
		result = await self.session.execute(
			select(self.model).where(self.model.owner_id == owner_id)
		)

		return result.scalar_one_or_none()

