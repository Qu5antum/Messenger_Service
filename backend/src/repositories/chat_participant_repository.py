from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from .base_repository import BaseRepository
from src.database.models import ChatParticipant


class ChatParticipantRepository(BaseRepository):
	model = ChatParticipant

	async def get_private_chat_of_two_user(self, userId1: UUID, userId2: UUID):
		result = await self.session.execute(
			select(self.model.chat_id)
			.where(self.model.user_id.in_([userId1, userId2]))
			.group_by(self.model.chat_id)
			.having(func.count(self.model.chat_id) == 2)
		)

		return result.scalar_one_or_none()

	async def is_participant(self, userId: UUID, chatId: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(
				self.model.user_id == userId,
				self.model.chat_id == chatId
			)
		)

		return result.scalar_one_or_none()

	async def get_participants(self, chatId: UUID):
		result = await self.session.execute(
			select(self.model)
			.options(selectinload(self.model.user))
			.where(self.model.chat_id == chatId)
		)

		return result.scalars().all()

	async def get_user_participant_in_chats(self, userId: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(self.model.user_id == userId)
		)

		return result.scalars().all()