import logging
from sqlalchemy.orm import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.api.schemas.chat_schema import ChatCreate, ChatResponse
from src.repositories.chat_repository import ChatRepository
from src.repositories.user_repository import UserRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.exception_handlers.user_exceptions import UserNotFoundException
from src.exception_handlers.db_exception import DatabaseException

logger = logging.getLogger("auth")


class ChatService:
	def __init__(self, session: AsyncSession):
		self.session = session
		self.chat_repo = ChatRepository(session=self.session)
		self.user_repo = UserRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)

	async def create_private_chat(self, phone_number: str, current_user: User) -> ChatResponse:
		user = await self.user_repo.get_user_id_by_phone_number(phone_number=phone_number)

		if not user:
			logger.warning(
				"User not found by phone number",
				extra={"phone_number": phone_number}
			)

			raise UserNotFoundException("User not found")

		chat_participant = self.chat_participant_repo.get_private_chat_of_two_user(
			userId1=user.id,
			userId2=current_user.id
		)

		if chat_participant:
			chat = await self.chat_repo.get(chat_participant.chat_id)

			logger.info("Chat already exits of this users")

			return chat
		try:
			new_private_chat = await self.chat_repo.create()

			new_chat_participants = await self.chat_participant_repo.create(
				chat_id=chat_participant.chat_id,
				user_id=current_user.id
			)

			new_chat_participants = await self.chat_participant_repo.create(
				chat_id=chat_participant.chat_id,
				user_id=user.id
			)

			await self.session.commit()

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database Error",
				exc_info=True,
				extra={
					"to_user": user.id,
					"current_user": current_user.id
				}
			)

			raise DatabaseException("Database Error")

		logger.info(
			"New chat created, and chat participants added",
			extra={
					"to_user": user.id,
					"current_user": current_user.id
				}
			)

		return new_private_chat

		async def create_group_chat(chat: ChatCreate, user: User) -> ChatResponse:
			try:
				new_group_chat = await self.chat_repo.create(
					is_group=True,
					title= chat.title,
					avatar=chat.title,
					description=chat.description,
					owner_id=user.id
				)

				await self.session.commit()

			except IntegrityError:
				await self.session.rollback()

				logger.error(
					"Database error, chat not created",
					exc_info=True,
					extra={"user_id": str(user.id)}
				)

				raise DatabaseException("Database error, chat not created")

			logger.info(
				"New group chat created",
				extra={"user_id": str(user.id)}
			)

			return new_group_chat














