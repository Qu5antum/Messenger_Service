from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.database.db import AsyncSession
from .base_repository import BaseRepository
from src.repositories.user_repository import UserRepository
from src.database.models import Chat


class ChatRepository(BaseRepository):
	model = Chat

	def __init__(
        self,
        session: AsyncSession,
        user_repo: UserRepository,
    ):
		super().__init__(session)
		self.user_repo = user_repo

	async def get_chat_by_owner_id(self, owner_id: UUID, chat_id: UUID):
		result = await self.session.execute(
			select(self.model)
			.where(
				self.model.owner_id == owner_id,
				self.model.id == chat_id
			)
		)

		return result.scalar_one_or_none()

	async def get_chat_if_private_title_as_username(self, chatId: UUID, current_user_id: UUID):
		result = await self.session.execute(
			select(self.model)
			.options(selectinload(self.model.chat_participants))
			.where(self.model.id == chatId)
		)

		chat = result.scalar_one_or_none()

		if not chat.is_group:
			other_participant = next(
				p for p in chat.chat_participants
				if p.user_id != current_user_id
			)

			username = await self.user_repo.get_username_by_user_id(
				userId=other_participant.user_id
			)

			chat.title = username

		return chat

	async def get_chats_by_ids(self, chatIds: list[UUID], current_user_id: UUID):
		result = await self.session.execute(
			select(self.model)
			.options(selectinload(self.model.chat_participants))
			.where(self.model.id.in_(chatIds))
		)

		chats = result.scalars().all()

		for chat in chats:
			if not chat.is_group:
				other_participant = next(
					p for p in chat.chat_participants
					if p.user_id != current_user_id
				)

				username = await self.user_repo.get_username_by_user_id(
					userId=other_participant.user_id
				)

				chat.title = username

		return chats