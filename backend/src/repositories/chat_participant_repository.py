from uuid import UUID
from sqlalchemy import select

from .base_repository import BaseRepository
from src.database.models import ChatParticipant


class ChatParticipantRepository(BaseRepository):
	model = ChatParticipant

	async def get_private_chat_of_two_user(self, userId1: UUID, userId2: UUID):
		result = await self.session.execute(
			select(self.model.chat_id)
			.where(
				self.model.user_id == userId1,
				self.model.user_id == userId2
			)
		)

		return result.scalar_one_or_none()

	async def get_chat_participant_by_user_id(self, userId: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(self.model.user_id == userId)
		)

		return result.scalar_one_or_none()